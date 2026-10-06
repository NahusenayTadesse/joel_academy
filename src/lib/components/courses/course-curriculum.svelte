<script lang="ts" module>
	import type { Component } from 'svelte';
	import CirclePlay from '@lucide/svelte/icons/circle-play';
	import Download from '@lucide/svelte/icons/download';
	import FileText from '@lucide/svelte/icons/file-text';
	import Link2 from '@lucide/svelte/icons/link-2';
	import type { CourseLesson, CourseSection } from '$lib/content/catalog.types';

	const LESSON_ICONS: Record<CourseLesson['lessonType'], Component> = {
		VIDEO: CirclePlay,
		TEXT: FileText,
		DOCUMENT: FileText,
		DOWNLOAD: Download,
		EXTERNAL_LINK: Link2
	};
</script>

<script lang="ts">
	import { Accordion } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Lock from '@lucide/svelte/icons/lock';
	import Badge from '$lib/components/ui/badge.svelte';
	import { formatDurationSeconds } from '$lib/format';

	let { sections }: { sections: CourseSection[] } = $props();

	// Keyed on the id (a primitive), so the open state only resets when a different course loads.
	const firstSectionId = $derived(sections[0]?.id);
	/* The first section starts open. */
	let openSections = $derived(firstSectionId ? [firstSectionId] : []);
	const lessonCount = $derived(
		sections.reduce((total, section) => total + section.lessons.length, 0)
	);
</script>

{#snippet lessonRow(lesson: CourseLesson)}
	{@const Icon = LESSON_ICONS[lesson.lessonType]}
	<div
		class="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0"
	>
		<div class="flex min-w-0 items-center gap-2.5">
			<Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<span class="truncate text-sm text-foreground">{lesson.title}</span>
			{#if lesson.isPreview}
				<Badge variant="info" class="shrink-0">Preview</Badge>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
			{#if lesson.durationSeconds}
				<span>{formatDurationSeconds(lesson.durationSeconds)}</span>
			{/if}
			{#if !lesson.isPreview}
				<Lock class="size-3.5" aria-label="Locked" />
			{/if}
		</div>
	</div>
{/snippet}

{#if firstSectionId}
	<div>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-foreground">Curriculum</h2>
			<span class="text-sm text-muted-foreground">
				{sections.length} sections • {lessonCount} lessons
			</span>
		</div>
		<Accordion.Root
			type="multiple"
			bind:value={openSections}
			class="rounded-xl border border-border px-4"
		>
			{#each sections as section (section.id)}
				<Accordion.Item value={section.id} class="border-b">
					<Accordion.Header class="flex">
						<Accordion.Trigger
							class="flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180"
						>
							<span class="flex flex-col items-start gap-0.5 text-left">
								<span>{section.title}</span>
								<span class="text-xs font-normal text-muted-foreground">
									{section.lessons.length} lessons
								</span>
							</span>
							<ChevronDown
								class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
							/>
						</Accordion.Trigger>
					</Accordion.Header>
					<Accordion.Content
						class="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
					>
						<div class="pt-0 pb-4">
							{#if section.description}
								<p class="mb-2 text-sm text-muted-foreground">{section.description}</p>
							{/if}
							{#each section.lessons as lesson (lesson.id)}
								{@render lessonRow(lesson)}
							{/each}
						</div>
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</div>
{/if}
