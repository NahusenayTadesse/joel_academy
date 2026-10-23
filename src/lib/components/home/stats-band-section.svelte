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
	import { inView } from '$lib/attachments';
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
	<section class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
		<div
			class="relative isolate overflow-hidden rounded-[2rem] bg-linear-to-br from-[#0b2a5c] via-[#1d6fe0] to-[#0a9ec2] px-6 py-14 text-white shadow-glow"
		>
			<div
				class="absolute inset-0 -z-10 opacity-30"
				style="background-image: radial-gradient(rgb(255 255 255 / 0.25) 1px, transparent 1px); background-size: 22px 22px; mask-image: linear-gradient(to bottom, #000, transparent)"
				aria-hidden="true"
			></div>
			<div
				class="glow absolute -top-1/2 -right-1/4 -z-10 size-[30rem] opacity-40"
				style:--glow-color="#c4f1ff"
				aria-hidden="true"
			></div>
			<div
				class="reveal-stagger grid grid-cols-1 gap-10 text-center sm:grid-cols-3"
				{@attach inView()}
			>
				{#each items as item (item.label)}
					<div class="flex flex-col gap-2">
						<span
							class="text-5xl font-bold tracking-tight sm:text-6xl"
							style="font-family: var(--font-heading)"
						>
							<AnimatedCounter value={item.value} format={FORMATTERS[item.kind]} />
						</span>
						<span class="text-sm font-medium tracking-wide text-white/75 uppercase">{item.label}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}
