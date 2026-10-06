<script lang="ts" module>
	export type StatsBandKind = 'count' | 'number' | 'rating' | 'percent';

	export interface StatsBandItem {
		value: number;
		label: string;
		kind: StatsBandKind;
	}
</script>

<script lang="ts">
	import AnimatedCounter from '$lib/components/common/animated-counter.svelte';
	import { formatCompactNumber } from '$lib/format';

	let { items }: { items: StatsBandItem[] } = $props();

	const FORMATTERS: Record<StatsBandKind, (value: number) => string> = {
		count: (value) => `${formatCompactNumber(value)}+`,
		number: (value) => formatCompactNumber(value),
		rating: (value) => `${value.toFixed(1)}/5`,
		percent: (value) => `${value}%`
	};
</script>

{#if items.length > 0}
	<section class="bg-brand">
		<div
			class="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-14 text-center sm:grid-cols-3 sm:px-6"
		>
			{#each items as item (item.label)}
				<div class="flex flex-col gap-1">
					<span class="text-4xl font-bold tracking-tight text-surface-dark sm:text-5xl">
						<AnimatedCounter value={item.value} format={FORMATTERS[item.kind]} />
					</span>
					<span class="text-sm font-medium text-surface-dark/70">{item.label}</span>
				</div>
			{/each}
		</div>
	</section>
{/if}
