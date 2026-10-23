<script lang="ts" module>
	export interface SidebarLesson {
		id: number;
		title: string;
		durationSeconds: number | null;
		completed: boolean;
		locked: boolean;
	}
</script>

<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Circle from '@lucide/svelte/icons/circle';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CirclePlay from '@lucide/svelte/icons/circle-play';
	import Lock from '@lucide/svelte/icons/lock';
	import { SvelteSet } from 'svelte/reactivity';
	import { formatDurationSeconds } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		curriculum,
		currentLessonId,
		overallProgress,
		hrefFor,
		onSelectLesson
	}: {
		curriculum: { id: number; title: string; lessons: SidebarLesson[] }[];
		currentLessonId: number | null;
		overallProgress: number;
		hrefFor: (lessonId: number) => string;
		onSelectLesson?: () => void;
	} = $props();

	const collapsedSections = new SvelteSet<number>();

	function toggleSection(id: number) {
		if (collapsedSections.has(id)) collapsedSections.delete(id);
		else collapsedSections.add(id);
	}

	const circumference = 2 * Math.PI * 15.9155;
</script>

<div class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<div class="flex items-center justify-between gap-4 border-b border-sidebar-border p-5">
		<div>
			<h2 class="text-sm font-bold text-white">{m.learn_course_content()}</h2>
			<p class="mt-1 text-xs text-sidebar-foreground/60">{m.learn_percent_completed({ percent: overallProgress })}</p>
		</div>
		<div class="relative size-10 shrink-0">
			<svg class="size-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
				<circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" stroke-width="3" class="text-white/10" />
				<circle
					cx="18"
					cy="18"
					r="15.9155"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-dasharray={circumference}
					stroke-dashoffset={circumference - (circumference * overallProgress) / 100}
					stroke-linecap="round"
					class="text-sidebar-primary"
				/>
			</svg>
		</div>
	</div>
	<nav class="flex-1 overflow-y-auto py-3" aria-label={m.learn_course_lessons()}>
		{#each curriculum as section (section.id)}
			{@const collapsed = collapsedSections.has(section.id)}
			{@const completedCount = section.lessons.filter((lesson) => lesson.completed).length}
			{@const isSectionComplete = section.lessons.length > 0 && completedCount === section.lessons.length}
			<div class="mb-1">
				<button
					type="button"
					onclick={() => toggleSection(section.id)}
					class="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-sidebar-accent"
					aria-expanded={!collapsed}
				>
					<span class="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
						{#if collapsed}
							<ChevronRight class="size-4 shrink-0 text-sidebar-foreground/50" />
						{:else}
							<ChevronDown class="size-4 shrink-0 text-sidebar-foreground/50" />
						{/if}
						<span class="truncate">{section.title}</span>
					</span>
					{#if isSectionComplete}
						<span
							class="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-medium text-brand-ink"
						>
							<Check class="size-3" />
							<span>{m.learn_completed_badge()}</span>
						</span>
					{:else}
						<span class="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-sidebar-foreground/60">
							{completedCount}/{section.lessons.length}
						</span>
					{/if}
				</button>
				{#if !collapsed}
					<div class="space-y-0.5">
						{#each section.lessons as lesson (lesson.id)}
							{@const isActive = lesson.id === currentLessonId}
							<a
								href={hrefFor(lesson.id)}
								onclick={() => onSelectLesson?.()}
								data-sveltekit-noscroll
								data-sveltekit-replacestate
								aria-current={isActive ? 'true' : undefined}
								class={cn(
									'flex w-full items-center gap-3 border-l-2 py-2.5 pr-4 pl-9 text-left text-sm transition-colors',
									isActive
										? 'border-sidebar-primary bg-white/5 text-white'
										: 'border-transparent text-sidebar-foreground/70 hover:bg-white/5'
								)}
							>
								{#if lesson.completed}
									<CircleCheck class="size-4 shrink-0 text-brand-ink" />
								{:else if lesson.locked}
									<Lock class="size-4 shrink-0 text-sidebar-foreground/30" />
								{:else if isActive}
									<CirclePlay class="size-4 shrink-0 text-sidebar-primary" />
								{:else}
									<Circle class="size-4 shrink-0 text-sidebar-foreground/30" />
								{/if}
								<span class="min-w-0 flex-1 truncate">{lesson.title}</span>
								{#if lesson.durationSeconds}
									<span class="shrink-0 text-[10px] text-sidebar-foreground/50">
										{formatDurationSeconds(lesson.durationSeconds)}
									</span>
								{/if}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>
</div>
