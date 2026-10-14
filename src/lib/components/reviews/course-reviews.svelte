<script lang="ts">
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Button from '$lib/components/ui/button.svelte';
	import ReviewForm from './review-form.svelte';
	import ReviewItem from './review-item.svelte';
	import ReviewSummary from './review-summary.svelte';
	import type { RatingSummary } from './rules';

	/*
	 * The course page's reviews: the average and its 5→1 breakdown, the viewer's own review (or why
	 * they cannot write one), then the published reviews, newest first, with a "show more" link
	 * that works without JavaScript.
	 */
	let {
		summary,
		reviews,
		moreHref,
		viewer,
		error = undefined
	}: {
		summary: RatingSummary;
		reviews: { id: number; author: string; rating: number; comment: string | null; createdAt: string }[];
		/** The next page of reviews, or null when every one is shown. */
		moreHref: string | null;
		viewer: {
			enrollment: 'PENDING' | 'ACTIVE' | 'REJECTED' | null;
			own: { rating: number; comment: string | null; status: 'PUBLISHED' | 'HIDDEN' } | null;
		};
		error?: string;
	} = $props();

	const canWrite = $derived(viewer.enrollment === 'ACTIVE');
</script>

<section id="reviews" class="flex scroll-mt-24 flex-col gap-6" aria-labelledby="reviews-heading">
	<h2 id="reviews-heading" class="text-lg font-semibold text-foreground">Student reviews</h2>

	{#if summary.count > 0}
		<ReviewSummary {summary} />
	{/if}

	{#if canWrite || viewer.own}
		<ReviewForm own={viewer.own} canEdit={canWrite} {error} />
	{:else}
		<p class="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
			<MessageSquare class="size-4 shrink-0" aria-hidden="true" />
			{#if viewer.enrollment === 'PENDING'}
				You can review this course once your enrollment is active.
			{:else}
				Enroll to review this course.
			{/if}
		</p>
	{/if}

	{#if reviews.length > 0}
		<div class="flex flex-col">
			{#each reviews as review (review.id)}
				<ReviewItem
					author={review.author}
					rating={review.rating}
					comment={review.comment}
					createdAt={review.createdAt}
				/>
			{/each}
		</div>
		{#if moreHref}
			<Button
				href={moreHref}
				variant="outline"
				class="self-start"
				rel="nofollow"
				data-sveltekit-noscroll
				data-sveltekit-replacestate
			>
				Show more reviews
			</Button>
		{/if}
	{:else if summary.count === 0}
		<p class="text-sm text-muted-foreground">No reviews yet.{canWrite ? ' Be the first to share what you think.' : ''}</p>
	{/if}
</section>
