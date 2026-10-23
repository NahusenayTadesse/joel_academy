<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	/** A card built around a circular progress ring - for the most recent course's completion. */
	let {
		label,
		value,
		description,
		href,
		class: className = ''
	}: { label: string; value: number; description?: string; href?: string; class?: string } = $props();

	const RADIUS = 40;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	const clamped = $derived(Math.min(Math.max(value, 0), 100));
	const offset = $derived(CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE);
</script>

<Card class={cn('flex items-center gap-4 p-5', className)}>
	<svg viewBox="0 0 96 96" class="size-20 shrink-0 -rotate-90" role="img" aria-label={m.learn_percent_complete({ percent: Math.round(clamped) })}>
		<circle cx="48" cy="48" r={RADIUS} class="stroke-muted" stroke-width="8" fill="none" />
		<circle
			cx="48"
			cy="48"
			r={RADIUS}
			class="stroke-brand transition-[stroke-dashoffset] duration-500 ease-out"
			stroke-width="8"
			fill="none"
			stroke-linecap="round"
			stroke-dasharray={CIRCUMFERENCE}
			stroke-dashoffset={offset}
		/>
		<text
			x="48"
			y="48"
			text-anchor="middle"
			dominant-baseline="central"
			class="rotate-90 fill-foreground text-[22px] font-semibold"
			style:transform-origin="48px 48px"
		>
			{Math.round(clamped)}%
		</text>
	</svg>
	<div class="min-w-0">
		{#if href}
			<a {href} class="text-sm font-semibold text-foreground hover:underline">{label}</a>
		{:else}
			<p class="text-sm font-semibold text-foreground">{label}</p>
		{/if}
		{#if description}<p class="mt-1 text-sm text-muted-foreground">{description}</p>{/if}
	</div>
</Card>
