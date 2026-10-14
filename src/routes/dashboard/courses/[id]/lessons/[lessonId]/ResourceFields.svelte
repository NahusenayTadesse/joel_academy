<script lang="ts">
	import type { Writable } from 'svelte/store';
	import Link from '@lucide/svelte/icons/link';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { formatFileSize, LESSON_FILE_ACCEPT } from '$lib/lesson-files';

	/** Loose for the reason the kit's `InputComp` gives: fields are indexed by name. */
	type FormStore = Writable<Record<string, any>>;

	/**
	 * A resource's fields for the add and edit dialogs: a title, then either a link or a file. The
	 * file is a plain input posted beside the form's fields; the server checks it (type, contents,
	 * size) and keeps the stored file when an edit chooses none.
	 */
	let {
		form,
		errors,
		values,
		current = null,
		maxUploadBytes
	}: {
		form: FormStore;
		errors: FormStore;
		values: Record<string, unknown>;
		/** The file already attached, when editing one. */
		current?: { name: string; size: number } | null;
		maxUploadBytes: number;
	} = $props();

	const kind = $derived(values.kind === 'FILE' ? 'FILE' : 'LINK');
	let chosen = $state<{ name: string; size: number } | null>(null);
	const tooLarge = $derived(Boolean(chosen && chosen.size > maxUploadBytes));

	function setKind(next: 'LINK' | 'FILE') {
		form.update((value) => ({ ...value, kind: next }));
	}

	const kinds = [
		{ value: 'LINK', label: 'Link', icon: Link },
		{ value: 'FILE', label: 'Upload a file', icon: Paperclip }
	] as const;
</script>

<!-- Own ids: the lesson form behind the dialog has its own `title`. -->
<InputComp {form} {errors} name="title" id="resource-title" label="Title" placeholder="Week 1 slides" />

<fieldset class="flex flex-col gap-2">
	<legend class="mb-2 text-sm font-medium">Resource</legend>
	<div class="grid grid-cols-2 gap-2">
		{#each kinds as option (option.value)}
			<label
				class={cn(
					'flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
					kind === option.value ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted'
				)}
			>
				<input
					type="radio"
					name="kind"
					value={option.value}
					checked={kind === option.value}
					onchange={() => setKind(option.value)}
					class="sr-only"
				/>
				<option.icon class="size-4" aria-hidden="true" />
				{option.label}
			</label>
		{/each}
	</div>
</fieldset>

{#if kind === 'LINK'}
	<InputComp {form} {errors} name="url" id="resource-url" label="Link" placeholder="https://…" />
{:else}
	<div class="flex flex-col gap-1.5">
		<label for="resource-file" class="text-sm font-medium">File</label>
		{#if current}
			<p class="text-xs text-muted-foreground">
				Attached: <span class="font-medium text-foreground">{current.name}</span>
				{current.size ? `(${formatFileSize(current.size)})` : ''}. Choose another file to replace it.
			</p>
		{/if}
		<input
			id="resource-file"
			type="file"
			name="file"
			accept={LESSON_FILE_ACCEPT}
			aria-describedby="resource-file-hint"
			aria-invalid={tooLarge ? 'true' : undefined}
			onchange={(event) => {
				const file = event.currentTarget.files?.[0];
				chosen = file ? { name: file.name, size: file.size } : null;
			}}
			class="block w-full cursor-pointer rounded-md border bg-background text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-0 file:border-r file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
		/>
		<p id="resource-file-hint" class={cn('text-xs', tooLarge ? 'text-destructive' : 'text-muted-foreground')}>
			{#if tooLarge}
				{formatFileSize(chosen?.size)} is over the {formatFileSize(maxUploadBytes)} limit.
			{:else}
				PDF, images, ZIP, Word, Excel, PowerPoint, MP3, text or CSV; up to {formatFileSize(maxUploadBytes)}. Only
				students who can open this lesson can download it.
			{/if}
		</p>
	</div>
{/if}

<InputComp {form} {errors} name="sortOrder" id="resource-order" label="Order" type="number" />
