<script lang="ts">
	import { initials } from '$lib/format';
	import { getLocale, INTL_LOCALES } from '$lib/i18n';
	import StarRating from './star-rating.svelte';

	let {
		author,
		rating,
		comment,
		createdAt
	}: { author: string; rating: number; comment: string | null; createdAt: string } = $props();

	// A fixed zone, so the server render and the browser agree on the day.
	const date = $derived(
		new Date(createdAt).toLocaleDateString(INTL_LOCALES[getLocale()], {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'Africa/Addis_Ababa'
		})
	);
</script>

<article class="flex gap-3 border-b border-border py-5 last:border-b-0">
	<span
		class="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
		aria-hidden="true">{initials(author)}</span
	>
	<div class="flex min-w-0 flex-1 flex-col gap-1.5">
		<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
			<h3 class="text-sm font-semibold text-foreground">{author}</h3>
			<time datetime={createdAt} class="text-xs text-muted-foreground">{date}</time>
		</div>
		<StarRating value={rating} starClass="size-3.5" />
		{#if comment}
			<p class="text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">{comment}</p>
		{/if}
	</div>
</article>
