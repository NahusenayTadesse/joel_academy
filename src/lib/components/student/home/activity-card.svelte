<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	/** A titled side card (the original `ActivityCard` frame) with an optional "View all" link. */
	let {
		title,
		viewAllHref,
		viewAllLabel = m.learn_view_all(),
		children,
		class: className = ''
	}: { title: string; viewAllHref?: string; viewAllLabel?: string; children: Snippet; class?: string } =
		$props();
</script>

<Card class={cn('flex flex-col', className)}>
	<div class="flex items-center justify-between gap-2 p-6 pb-3">
		<h2 class="text-base font-semibold text-foreground">{title}</h2>
		{#if viewAllHref}
			<a href={viewAllHref} class="text-sm font-medium text-primary-ink hover:underline">{viewAllLabel}</a>
		{/if}
	</div>
	<div class="px-4 pb-4">{@render children()}</div>
</Card>
