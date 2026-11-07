<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FileDown from '@lucide/svelte/icons/file-down';
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
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { resolve } from '$app/paths';
	import { DOWNLOADS, HANDOUT_STYLE_NAMES } from '$lib/downloads';
	import MoveButtons from '../MoveButtons.svelte';
	import HandoutFields from './HandoutFields.svelte';
	import { handoutSchema } from './schema';

	let { data } = $props();

	type Row = (typeof data.handouts)[number] & { position: number };

	const sectionName = (id: number | null) =>
		id === null ? 'Whole course' : (data.sections.find((section) => section.value === id)?.name ?? '—');
	const editHref = (id: number) =>
		resolve('/dashboard/courses/[id]/handouts/[handoutId]', { id: String(data.course.id), handoutId: String(id) });

	const rows = $derived(data.handouts.map((handout, position) => ({ ...handout, position })));

	const columns: ColumnDef<Row>[] = [
		{ id: 'order', header: '#', cell: ({ row }) => row.original.position + 1 },
		{ id: 'title', header: 'Handout', cell: ({ row }) => renderSnippet(titleCell, row.original) },
		{ id: 'section', header: 'For', cell: ({ row }) => sectionName(row.original.sectionId) },
		{ id: 'style', header: 'Style', cell: ({ row }) => HANDOUT_STYLE_NAMES[row.original.style] },
		{ id: 'audience', header: 'Who', cell: ({ row }) => renderSnippet(audienceCell, row.original) },
		{ id: 'status', header: 'Status', cell: ({ row }) => renderSnippet(statusCell, row.original) },
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet titleCell(row: Row)}
	<a href={editHref(row.id)} class="font-medium text-primary-ink underline-offset-2 hover:underline">{row.title}</a>
{/snippet}

{#snippet audienceCell(row: Row)}
	{#if row.audience === 'PUBLIC'}
		<Badge variant="secondary">Everyone</Badge>
	{:else}
		<Badge variant="outline">Enrolled students</Badge>
	{/if}
{/snippet}

{#snippet statusCell(row: Row)}
	<Statuses status={row.published ? 'active' : 'draft'} label={row.published ? 'Published' : 'Draft'} />
{/snippet}

{#snippet actionsCell(row: Row)}
	<div class="flex items-center justify-end gap-1">
		<MoveButtons action="?/move" id={row.id} first={row.position === 0} last={row.position === rows.length - 1} label="handout" />
		<Button href="{DOWNLOADS.handout(row.id)}?view" target="_blank" variant="ghost" size="sm" data-sveltekit-reload>
			<FileDown class="size-4" /> PDF
		</Button>
		<Button href={editHref(row.id)} variant="ghost" size="sm">
			<SquarePen class="size-4" /> Edit
		</Button>
		<ConfirmAction
			action="?/delete"
			label="Delete"
			variant="ghost"
			icon={Trash}
			title="Delete “{row.title}”?"
			description="Students can no longer download it. This cannot be undone."
			fields={{ id: row.id }}
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Handouts"
		eyebrow={data.course.name}
		tabTitle="Handouts · {data.course.name}"
		description="Branded PDFs for this course: notes, checklists, worksheets, reference sheets. Each one prints with the academy's logo and colours, and always shows its latest text."
	>
		{#snippet actions()}
			<Button href="/dashboard/courses/{data.course.id}" variant="outline" size="sm">
				<ArrowLeft class="size-4" /> Curriculum
			</Button>
			<Button href="{DOWNLOADS.outline(data.course.slug)}?view" target="_blank" variant="outline" size="sm" data-sveltekit-reload>
				<FileDown class="size-4" /> Course outline PDF
			</Button>
			<FormDialog
				title="New handout"
				description="Start with the basics; you write the body on the next page."
				triggerLabel="New handout"
				submitLabel="Create and write"
				action="?/add"
				data={data.form}
				schema={handoutSchema}
				resetOnSuccess
			>
				{#snippet fields({ form, errors })}
					<HandoutFields {form} {errors} sections={data.sections} />
				{/snippet}
			</FormDialog>
		{/snippet}
	</PageHeader>

	<Notice title="Generated PDFs. ">
		Besides handouts, every course has a <strong>course outline</strong> PDF (sections, lessons, what students
		learn), and every section has a <strong>workbook</strong> PDF on the curriculum page (its lessons' notes and
		resources, plus the section's published handouts). Students find them beside each lesson's resources; the
		outline and handouts for everyone are also on the public course page.
	</Notice>

	<PageSection title="This course's handouts">
		{#if rows.length}
			{#key data.handouts}
				<DataTable {columns} data={rows} variant="compact" paginate={false} fileName="handouts" />
			{/key}
		{:else}
			<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
				No handouts yet. A checklist for setting up tools, a worksheet for a section's exercises or a one-page cheat sheet
				are good first ones.
			</p>
		{/if}
	</PageSection>
</div>
