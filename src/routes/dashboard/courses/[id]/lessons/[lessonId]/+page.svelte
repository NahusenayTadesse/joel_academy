<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import Trash from '@lucide/svelte/icons/trash';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import LookupSection from '@nahu/admin-kit/components/lookup/LookupSection.svelte';
	import RichEditor from '@nahu/admin-kit/formComponents/RichEditor.svelte';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Card, CardContent } from '@nahu/admin-kit/components/ui/card/index.js';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import type { LookupConfig } from '@nahu/admin-kit/components/lookup/types';
	import LessonFields from '../../LessonFields.svelte';
	import { lessonEditSchema, resourceEditSchema, resourceSchema } from '../../schema';

	let { data } = $props();

	// Seeded once from the load; after a save superforms keeps what the server returned.
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed, allErrors } = createForm(data.form, lessonEditSchema, {
		resetForm: false
	});

	const back = $derived(`/dashboard/courses/${data.course.id}`);

	const resourceConfig: LookupConfig = {
		entity: 'Resource',
		plural: 'Resources',
		fields: [
			{ name: 'title', label: 'Title', type: 'text' },
			{ name: 'url', label: 'Link', type: 'text', placeholder: 'https://…', long: 40 },
			{ name: 'sortOrder', label: 'Order', type: 'number' }
		]
	};
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title={data.lesson.title}
		eyebrow="Lesson · {data.course.name}"
		description={data.completions
			? `Completed by ${data.completions} student(s).`
			: 'No student has completed this lesson yet.'}
	>
		{#snippet actions()}
			<Button href={back} variant="outline" size="sm">
				<ArrowLeft class="size-4" /> Curriculum
			</Button>
			<ConfirmAction
				action="?/delete"
				label="Delete lesson"
				variant="destructive"
				icon={Trash}
				title="Delete “{data.lesson.title}”?"
				description={data.completions
					? `${data.completions} student(s) have completed it; their progress on it and its resources are deleted too. This cannot be undone.`
					: 'Its resources are deleted with it. This cannot be undone.'}
			/>
		{/snippet}
	</PageHeader>

	<Card>
		<CardContent class="p-4">
			<form method="post" action="?/save" use:enhance class="flex flex-col gap-4">
				<Errors allErrors={$allErrors} />
				<input type="hidden" name="id" value={$form.id} />
				<div class="grid gap-x-6 gap-y-2 lg:grid-cols-2">
					<div class="flex flex-col gap-2">
						<LessonFields {form} {errors} values={$form} sections={data.sections} />
					</div>
					<div class="flex flex-col gap-2 p-1">
						<RichEditor
							name="content"
							bind:value={$form.content}
							label="Lesson body"
							description="Notes, instructions or the reading itself. Shown under the video for video lessons."
							error={$errors.content?.[0] ?? ''}
							placeholder="Write the lesson…"
							minHeight="22rem"
						/>
					</div>
				</div>
				<Button type="submit" class="self-start">
					{#if $delayed}
						<LoadingBtn name="Saving" />
					{:else}
						<Save class="size-4" /> Save lesson
					{/if}
				</Button>
			</form>
		</CardContent>
	</Card>

	<PageSection
		title="Resources"
		hint="Links students get with this lesson: slides, files on a drive, a tool's sign-up page."
	>
		<LookupSection
			config={resourceConfig}
			rows={data.resources}
			addForm={data.resourceAddForm}
			editForm={data.resourceEditForm}
			canDelete
			actions={{ add: '?/addResource', edit: '?/editResource', delete: '?/deleteResource' }}
			schemas={{ add: resourceSchema, edit: resourceEditSchema }}
		/>
	</PageSection>
</div>
