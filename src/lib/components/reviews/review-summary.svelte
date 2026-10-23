<script lang="ts">
	import StarRating from './star-rating.svelte';
	import { m } from '$lib/paraglide/messages';
	import { reviewCountText, type RatingSummary } from './rules';

	let { summary }: { summary: RatingSummary } = $props();
</script>

<div class="flex flex-col gap-6 sm:flex-row sm:items-center">
	<div class="flex shrink-0 flex-col items-start gap-1 sm:w-40 sm:items-center sm:text-center">
		<p class="text-5xl font-bold tracking-tight text-foreground">{summary.average.toFixed(1)}</p>
		<StarRating value={summary.average} starClass="size-4" />
		<p class="text-sm text-muted-foreground">{reviewCountText(summary.count)}</p>
	</div>

	<ul class="flex min-w-0 flex-1 flex-col gap-2" aria-label={m.catalog_review_breakdown_label()}>
		{#each summary.distribution as row (row.stars)}
			<li class="flex items-center gap-3 text-sm">
				<span class="w-12 shrink-0 text-muted-foreground" aria-hidden="true">{m.catalog_review_star_short({ stars: row.stars })}</span>
				<span class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
					<span class="block h-full rounded-full bg-warning" style:width="{row.percent}%"></span>
				</span>
				<span class="w-10 shrink-0 text-right text-muted-foreground tabular-nums" aria-hidden="true"
					>{row.percent}%</span
				>
				<span class="sr-only">
					{m.catalog_review_breakdown_row({ stars: row.stars, reviews: reviewCountText(row.count), percent: row.percent })}
				</span>
			</li>
		{/each}
	</ul>
</div>
