<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Link from '@lucide/svelte/icons/link';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Trash from '@lucide/svelte/icons/trash';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { formatFileSize, lessonFileHref } from '$lib/lesson-files';
	import { resourceEditSchema, resourceSchema } from '../../schema';
	import ResourceFields from './ResourceFields.svelte';
	import type { PageData } from './$types';

	type Resource = PageData['resources'][number];

	/** The lesson's resources: links and uploaded files, each added and edited in a dialog. */
	let {
		resources,
		addForm,
		editForm,
		maxUploadBytes
	}: {
		resources: Resource[];
		addForm: PageData['resourceAddForm'];
		editForm: PageData['resourceEditForm'];
		maxUploadBytes: number;
	} = $props();

	let editOpen = $state(false);
	let editing = $state<Resource>();
	const editSeed = $derived(
		editing
			? {
					id: editing.id,
					title: editing.title,
					kind: editing.hasFile ? ('FILE' as const) : ('LINK' as const),
					url: editing.url ?? '',
					sortOrder: editing.sortOrder
				}
			: undefined
	);

	function edit(resource: Resource) {
		editing = resource;
		editOpen = true;
	}
</script>

<div class="flex flex-col gap-3">
	<div class="self-start">
		<FormDialog
			title="Add a resource"
			triggerLabel="Add resource"
			submitLabel="Add resource"
			action="?/addResource"
			data={addForm}
			schema={resourceSchema}
			multipart
			resetOnSuccess
		>
			{#snippet fields({ form, errors, values })}
				<ResourceFields {form} {errors} {values} {maxUploadBytes} />
			{/snippet}
		</FormDialog>
	</div>

	{#if resources.length === 0}
		<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
			No resources yet. Add a link, or upload slides, worksheets or audio for this lesson.
		</p>
	{:else}
		<ul class="divide-y rounded-md border">
			{#each resources as resource (resource.id)}
				<li class="flex flex-wrap items-center gap-3 p-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
						{#if resource.hasFile}<Paperclip class="size-4" />{:else}<Link class="size-4" />{/if}
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{resource.title}</p>
						{#if resource.hasFile}
							<p class="truncate text-xs text-muted-foreground">
								{resource.fileName}{resource.fileSize ? ` · ${formatFileSize(resource.fileSize)}` : ''}
							</p>
						{:else if resource.url}
							<p class="truncate text-xs text-muted-foreground">{resource.url}</p>
						{/if}
					</div>
					<span class="text-xs text-muted-foreground tabular-nums" title="Order">#{resource.sortOrder}</span>
					<div class="flex items-center gap-1">
						{#if resource.hasFile}
							<Button
								variant="ghost"
								size="sm"
								href={lessonFileHref(resource.id)}
								download={resource.fileName ?? ''}
								data-sveltekit-reload
							>
								<Download class="size-4" /> Download
							</Button>
						{:else if resource.url}
							<Button variant="ghost" size="sm" href={resource.url} target="_blank" rel="noopener noreferrer">
								<ExternalLink class="size-4" /> Open
							</Button>
						{/if}
						<Button variant="ghost" size="sm" onclick={() => edit(resource)}>
							<SquarePen class="size-4" /> Edit
						</Button>
						<ConfirmAction
							action="?/deleteResource"
							label="Delete"
							variant="ghost"
							icon={Trash}
							title="Delete “{resource.title}”?"
							description={resource.hasFile
								? 'The file is deleted too; students lose access to it. This cannot be undone.'
								: 'Students no longer see this link. This cannot be undone.'}
							fields={{ id: resource.id }}
						/>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<FormDialog
	title="Edit resource"
	action="?/editResource"
	data={editForm}
	schema={resourceEditSchema}
	bind:open={editOpen}
	seed={editSeed}
	multipart
	hideTrigger
>
	{#snippet fields({ form, errors, values })}
		<HiddenField name="id" value={values.id} />
		<ResourceFields
			{form}
			{errors}
			{values}
			{maxUploadBytes}
			current={editing?.hasFile ? { name: editing.fileName ?? editing.title, size: editing.fileSize ?? 0 } : null}
		/>
	{/snippet}
</FormDialog>
