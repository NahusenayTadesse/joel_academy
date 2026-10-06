<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Plus from '@lucide/svelte/icons/plus';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Trash from '@lucide/svelte/icons/trash';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { resolve } from '$app/paths';
	import { formatDuration } from '../../form-fields';
	import LessonFields from './LessonFields.svelte';
	import MoveButtons from './MoveButtons.svelte';
	import {
		LESSON_TYPE_NAMES,
		lessonSchema,
		sectionEditSchema,
		sectionSchema,
		type LessonType
	} from './schema';

	let { data } = $props();

	type Section = (typeof data.sections)[number];
	type LessonRow = Section['lessons'][number] & { position: number; last: boolean };

	const lessonCount = $derived(data.sections.reduce((sum, s) => sum + s.lessons.length, 0));
	const totalSeconds = $derived(
		data.sections.reduce(
			(sum, s) => sum + s.lessons.reduce((inner, l) => inner + (l.durationSeconds ?? 0), 0),
			0
		)
	);
	const previews = $derived(
		data.sections.reduce((sum, s) => sum + s.lessons.filter((l) => l.isPreview).length, 0)
	);

	// One edit-section and one add-lesson dialog for the whole page, opened from each section.
	let sectionEditOpen = $state(false);
	let sectionSeed = $state<{ id: number; title: string; description: string | null }>();
	let lessonOpen = $state(false);
	let lessonSeed = $state<{ sectionId: number }>();
	let lessonSectionName = $state('');

	function editSection(section: Section) {
		sectionSeed = { id: section.id, title: section.title, description: section.description };
		sectionEditOpen = true;
	}

	function addLesson(section: Section) {
		lessonSeed = { sectionId: section.id };
		lessonSectionName = section.title;
		lessonOpen = true;
	}

	const rowsOf = (section: Section): LessonRow[] =>
		section.lessons.map((lesson, i) => ({
			...lesson,
			position: i,
			last: i === section.lessons.length - 1
		}));

	const columns: ColumnDef<LessonRow>[] = [
		{ id: 'order', header: '#', cell: ({ row }) => row.original.position + 1 },
		{
			id: 'title',
			header: 'Lesson',
			cell: ({ row }) => renderSnippet(titleCell, row.original)
		},
		{
			id: 'type',
			header: 'Type',
			cell: ({ row }) => LESSON_TYPE_NAMES[row.original.lessonType as LessonType]
		},
		{
			id: 'duration',
			header: 'Duration',
			meta: { align: 'right' },
			cell: ({ row }) => formatDuration(row.original.durationSeconds) || '—'
		},
		{ id: 'flags', header: 'Access', cell: ({ row }) => renderSnippet(flagsCell, row.original) },
		{
			id: 'resources',
			header: 'Resources',
			meta: { align: 'right' },
			cell: ({ row }) => row.original.resources
		},
		{
			id: 'completions',
			header: 'Completed by',
			meta: { align: 'right' },
			cell: ({ row }) => row.original.completions
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet titleCell(row: LessonRow)}
	<a
		href={resolve('/dashboard/courses/[id]/lessons/[lessonId]', {
			id: String(data.course.id),
			lessonId: String(row.id)
		})}
		class="font-medium text-primary underline-offset-2 hover:underline">{row.title}</a
	>
{/snippet}

{#snippet flagsCell(row: LessonRow)}
	<div class="flex flex-wrap gap-1">
		{#if row.isPreview}<Badge variant="secondary">Preview</Badge>{/if}
		{#if !row.isMandatory}<Badge variant="outline">Optional</Badge>{/if}
		{#if row.lessonType === 'VIDEO' && !row.videoUrl}
			<Badge variant="destructive">No video yet</Badge>
		{/if}
	</div>
{/snippet}

{#snippet actionsCell(row: LessonRow)}
	<div class="flex items-center justify-end gap-1">
		<MoveButtons
			action="?/moveLesson"
			id={row.id}
			first={row.position === 0}
			last={row.last}
			label="lesson"
		/>
		<ConfirmAction
			action="?/deleteLesson"
			label="Delete"
			variant="ghost"
			icon={Trash}
			title="Delete “{row.title}”?"
			description={row.completions
				? `${row.completions} student(s) have completed it; their progress on it is deleted too. This cannot be undone.`
				: 'Its resources are deleted with it. This cannot be undone.'}
			fields={{ id: row.id }}
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title={data.course.name}
		eyebrow="Curriculum"
		tabTitle="Curriculum · {data.course.name}"
		description="{data.sections.length} sections · {lessonCount} lessons · {formatDuration(
			totalSeconds
		) || '0:00'} total · {previews} free previews"
	>
		{#snippet badges()}
			<Statuses
				status={data.course.status ? 'active' : 'draft'}
				label={data.course.status ? 'Published' : 'Draft'}
			/>
		{/snippet}
		{#snippet actions()}
			<Button href="/dashboard/courses" variant="outline" size="sm">
				<ArrowLeft class="size-4" /> All courses
			</Button>
			{#if data.course.status}
				<Button href="/courses/{data.course.slug}" target="_blank" variant="outline" size="sm">
					<ExternalLink class="size-4" /> View on site
				</Button>
			{/if}
			<FormDialog
				title="Add section"
				triggerLabel="Add section"
				submitLabel="Add section"
				action="?/addSection"
				data={data.sectionForm}
				schema={sectionSchema}
				resetOnSuccess
			>
				{#snippet fields({ form, errors })}
					<InputComp {form} {errors} name="title" label="Section title" required />
					<InputComp
						{form}
						{errors}
						name="description"
						label="Description (optional)"
						type="textarea"
						rows={3}
					/>
				{/snippet}
			</FormDialog>
		{/snippet}
	</PageHeader>

	{#if !data.sections.length}
		<Notice title="No sections yet. ">
			Add a section first (say, “Getting started”), then add lessons to it.
		</Notice>
	{/if}

	{#each data.sections as section, i (section.id)}
		<PageSection title="{i + 1}. {section.title}" hint={section.description ?? undefined}>
			{#snippet actions()}
				<MoveButtons
					action="?/moveSection"
					id={section.id}
					first={i === 0}
					last={i === data.sections.length - 1}
					label="section"
				/>
				<Button variant="ghost" size="sm" onclick={() => editSection(section)}>
					<SquarePen class="size-4" /> Edit
				</Button>
				<ConfirmAction
					action="?/deleteSection"
					label="Delete"
					variant="ghost"
					icon={Trash}
					title="Delete the section “{section.title}”?"
					description="Its {section.lessons
						.length} lesson(s), their resources and every student's progress on them are deleted too. This cannot be undone."
					fields={{ id: section.id }}
				/>
				<Button variant="outline" size="sm" onclick={() => addLesson(section)}>
					<Plus class="size-4" /> Add lesson
				</Button>
			{/snippet}

			{#if section.lessons.length}
				{#key section.lessons}
					<DataTable
						{columns}
						data={rowsOf(section)}
						variant="compact"
						paginate={false}
						fileName={section.title}
					/>
				{/key}
			{:else}
				<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
					No lessons in this section yet.
				</p>
			{/if}
		</PageSection>
	{/each}
</div>

<FormDialog
	title="Edit section"
	action="?/editSection"
	data={data.sectionEditForm}
	schema={sectionEditSchema}
	bind:open={sectionEditOpen}
	seed={sectionSeed}
	hideTrigger
>
	{#snippet fields({ form, errors, values })}
		<input type="hidden" name="id" value={values.id} />
		<InputComp {form} {errors} name="title" label="Section title" required />
		<InputComp
			{form}
			{errors}
			name="description"
			label="Description (optional)"
			type="textarea"
			rows={3}
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Add a lesson to “{lessonSectionName}”"
	description="Write the lesson body and add resources from the lesson's page afterwards."
	action="?/addLesson"
	submitLabel="Add lesson"
	data={data.lessonForm}
	schema={lessonSchema}
	bind:open={lessonOpen}
	seed={lessonSeed}
	hideTrigger
	resetOnSuccess
>
	{#snippet fields({ form, errors, values })}
		<LessonFields {form} {errors} {values} />
	{/snippet}
</FormDialog>
