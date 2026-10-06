<script lang="ts">
	import { onMount } from 'svelte';
	import { Tabs } from 'bits-ui';
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	/*
	 * The original lesson tabs. `html` arrives sanitised from the server (sanitize-html), which is
	 * what makes the {@html} below safe. Notes stay in this browser, as they did in the original; the parent
	 * must key this component on the lesson.
	 */
	let {
		lessonId,
		lessonType,
		html,
		externalUrl,
		resources
	}: {
		lessonId: number;
		lessonType: string;
		html: string;
		externalUrl: string | null;
		resources: { id: number; title: string; url: string | null }[];
	} = $props();

	const listClass =
		'inline-flex h-10 items-center justify-center rounded-full bg-white/5 p-1 text-sidebar-foreground/70';
	const triggerClass =
		'inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground data-[state=active]:shadow-sm';
	const contentClass =
		'mt-5 max-w-3xl ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none';

	// The parent keys this component on the lesson, so the note is read once per lesson, on mount:
	// storage exists only in the browser, and can throw (private mode) — notes are a convenience,
	// never a reason for the page to fail.
	const notesKey = $derived(`joel-academy-lesson-notes:${lessonId}`);
	let notes = $state('');
	let savedHere = $state(false);

	onMount(() => {
		try {
			const stored = localStorage.getItem(notesKey);
			notes = stored ?? '';
			savedHere = stored !== null;
		} catch {
			// Unavailable storage: start with an empty note.
		}
	});

	function saveNotes(value: string) {
		try {
			if (value) localStorage.setItem(notesKey, value);
			else localStorage.removeItem(notesKey);
			savedHere = Boolean(value);
		} catch {
			savedHere = false;
		}
	}
</script>

<Tabs.Root value="description" class="mt-6">
	<Tabs.List class={listClass}>
		<Tabs.Trigger value="description" class={triggerClass}>Description</Tabs.Trigger>
		<Tabs.Trigger value="resources" class={cn(triggerClass, 'gap-1.5')}>
			Resources
			{#if resources.length > 0}
				<span class="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">{resources.length}</span>
			{/if}
		</Tabs.Trigger>
		<Tabs.Trigger value="notes" class={triggerClass}>Notes</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="description" class={contentClass}>
		{#if html}
			<div class="lesson-content max-w-none text-sm text-sidebar-foreground/80">
				{@html html}
			</div>
		{/if}
		{#if lessonType === 'EXTERNAL_LINK' && externalUrl}
			<a
				href={externalUrl}
				target="_blank"
				rel="noopener noreferrer"
				class={cn(
					'inline-flex items-center gap-2 text-sm font-medium text-sidebar-primary hover:underline',
					html && 'mt-4'
				)}
			>
				<ExternalLink class="size-4" />
				Open external resource
			</a>
		{:else if !html}
			<p class="text-sm text-sidebar-foreground/60">This lesson has no written description.</p>
		{/if}
	</Tabs.Content>

	<Tabs.Content value="resources" class={contentClass}>
		{#if resources.length === 0}
			<p class="text-sm text-sidebar-foreground/60">No resources for this lesson.</p>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each resources as resource (resource.id)}
					{#snippet body()}
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sidebar-foreground/70"
						>
							<FileText class="size-5" />
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium text-white">{resource.title}</span>
						</span>
					{/snippet}
					{#if resource.url}
						<a
							href={resource.url}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-3 rounded-xl border border-sidebar-border bg-white/5 p-3 transition-colors hover:border-sidebar-primary"
						>
							{@render body()}
							<Download class="size-4 shrink-0 text-sidebar-foreground/50" aria-hidden="true" />
						</a>
					{:else}
						<div
							class="flex items-center gap-3 rounded-xl border border-sidebar-border bg-white/5 p-3 opacity-70"
							title="Contact your instructor to access this file"
						>
							{@render body()}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</Tabs.Content>

	<Tabs.Content value="notes" class={contentClass}>
		<div class="space-y-2">
			<Textarea
				bind:value={() => notes, (value) => ((notes = value ?? ''), saveNotes(notes))}
				placeholder="Write notes for this lesson..."
				rows={8}
				aria-label="Lesson notes"
				class="border-sidebar-border bg-white/5 text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-primary"
			/>
			<p class="flex items-center gap-1.5 text-xs text-sidebar-foreground/50">
				<NotebookPen class="size-3.5" aria-hidden="true" />
				{savedHere
					? 'Saved - on this device only'
					: 'Notes are saved on this device only, not synced across devices.'}
			</p>
		</div>
	</Tabs.Content>
</Tabs.Root>

<style>
	/* No typography plugin here, so the lesson body's own elements are styled directly. */
	.lesson-content :global(:where(p, ul, ol, pre, blockquote, table, img)) {
		margin-block: 0.75em;
	}
	.lesson-content :global(:where(h1, h2, h3, h4)) {
		margin-block: 1.25em 0.5em;
		color: white;
		font-weight: 700;
		line-height: 1.3;
	}
	.lesson-content :global(h1) {
		font-size: 1.5rem;
	}
	.lesson-content :global(h2) {
		font-size: 1.25rem;
	}
	.lesson-content :global(:where(h3, h4)) {
		font-size: 1.05rem;
	}
	.lesson-content :global(:where(ul, ol)) {
		padding-left: 1.25rem;
	}
	.lesson-content :global(ul) {
		list-style: disc;
	}
	.lesson-content :global(ol) {
		list-style: decimal;
	}
	.lesson-content :global(a) {
		color: var(--sidebar-primary);
		text-decoration: underline;
	}
	.lesson-content :global(:where(code, pre)) {
		border-radius: 0.375rem;
		background: rgb(255 255 255 / 0.08);
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.85em;
	}
	.lesson-content :global(code) {
		padding: 0.1em 0.3em;
	}
	.lesson-content :global(pre) {
		overflow-x: auto;
		padding: 0.75rem 1rem;
	}
	.lesson-content :global(blockquote) {
		border-left: 3px solid var(--sidebar-border);
		padding-left: 1rem;
		font-style: italic;
	}
	.lesson-content :global(img) {
		max-width: 100%;
		border-radius: 0.5rem;
	}
	.lesson-content > :global(:first-child) {
		margin-top: 0;
	}
</style>
