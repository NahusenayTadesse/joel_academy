<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import CourseThumbnail from '$lib/components/catalog/course-thumbnail.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';
	import ProgressBar from './progress-bar.svelte';

	/*
	 * The original "my courses" row: thumbnail, category, lesson count and a progress bar, or a
	 * completed badge at the end. A paid course awaiting or refused payment shows that instead.
	 */
	let {
		href,
		title,
		category,
		categorySlug,
		thumbnailUrl,
		progressPercent,
		completedLessons,
		totalLessons,
		status = 'ACTIVE',
		completed = false,
		rejectionReason = null,
		class: className = ''
	}: {
		href: string;
		title: string;
		category: string;
		categorySlug?: string;
		thumbnailUrl?: string | null;
		progressPercent: number;
		completedLessons?: number;
		totalLessons?: number;
		status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
		completed?: boolean;
		rejectionReason?: string | null;
		class?: string;
	} = $props();

	const percent = $derived(Math.min(Math.max(Math.round(progressPercent), 0), 100));
	const isComplete = $derived(status === 'ACTIVE' && (completed || percent >= 100));
</script>

<a
	{href}
	class={cn(
		'group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-primary/30',
		className
	)}
>
	<CourseThumbnail
		{title}
		categoryName={category}
		{categorySlug}
		{thumbnailUrl}
		showBadge={false}
		class="size-20 shrink-0 rounded-xl transition-transform duration-500 group-hover:scale-110"
	/>
	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-center justify-between gap-2">
			<Badge variant="secondary" class="tracking-wide uppercase">{category}</Badge>
			{#if status === 'ACTIVE' && totalLessons}
				<span class="shrink-0 text-xs text-muted-foreground">
					{completedLessons}/{totalLessons} Lessons
				</span>
			{/if}
		</div>
		<h4 class="mb-3 truncate font-semibold text-foreground">{title}</h4>
		{#if status === 'PENDING'}
			<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Clock class="size-3.5 shrink-0 text-warning" />
				Payment under review - you'll get access as soon as it's approved.
			</p>
		{:else if status === 'REJECTED'}
			<p class="flex items-center gap-1.5 truncate text-xs text-destructive">
				<TriangleAlert class="size-3.5 shrink-0" />
				{rejectionReason ? `Payment not approved: ${rejectionReason}` : 'Payment not approved - resubmit to continue.'}
			</p>
		{:else}
			<ProgressBar value={percent} />
		{/if}
	</div>
	{#if status === 'PENDING'}
		<Badge variant="warning" class="shrink-0">Pending</Badge>
	{:else if status === 'REJECTED'}
		<Badge variant="destructive" class="shrink-0">Resubmit</Badge>
	{:else if isComplete}
		<Badge class="shrink-0 gap-1 border border-primary/20 bg-primary/10 text-primary-ink hover:bg-primary/10">
			<CircleCheck class="size-3.5" />
			Completed
		</Badge>
	{:else}
		<span
			class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
		>
			<ChevronRight class="size-4" />
		</span>
	{/if}
</a>
