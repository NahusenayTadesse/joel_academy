<script lang="ts">
	import { inView } from '$lib/attachments';
	import { DEFAULT_LANDING, type LandingStep } from '$lib/content/landing';
	import SectionTitle from './section-title.svelte';

	let { items = DEFAULT_LANDING.howItWorks }: { items?: LandingStep[] } = $props();

	const stepNumber = (index: number) => String(index + 1).padStart(2, '0');
</script>

<section class="relative isolate overflow-hidden bg-surface-dark text-surface-dark-foreground">
	<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
		<div
			class="glow absolute -top-1/2 left-1/2 size-[56rem] -translate-x-1/2 opacity-25"
			style:--glow-color="#1d6fe0"
		></div>
		<div
			class="absolute inset-0 opacity-40"
			style="background-image: radial-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1px); background-size: 28px 28px; mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%)"
		></div>
	</div>
	<div class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
		<SectionTitle
			eyebrow="How it works"
			title="The learning"
			accent="framework"
			subtitle="Four simple steps from sign-up to certificate."
			align="center"
			tone="dark"
		/>
		<ol class="reveal-stagger relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" {@attach inView()}>
			{#each items as step, index (index)}
				<li
					class="group relative flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors duration-500 hover:border-sky-300/40 hover:bg-white/[0.06]"
				>
					<span
						class="text-gradient-ice text-5xl font-bold tracking-tight"
						style="font-family: var(--font-heading)"
					>
						{stepNumber(index)}
					</span>
					<span
						class="h-px w-12 bg-linear-to-r from-sky-400 to-transparent transition-all duration-500 group-hover:w-24"
						aria-hidden="true"
					></span>
					<h3 class="text-base font-semibold text-white">{step.title}</h3>
					<p class="text-sm leading-relaxed text-slate-400">{step.description}</p>
				</li>
			{/each}
		</ol>
	</div>
</section>
