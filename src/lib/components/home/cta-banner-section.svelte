<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { inView } from '$lib/attachments';
	import { DEFAULT_LANDING, type LandingFinalCta } from '$lib/content/landing';
	import { cmsHref } from './cms-link';

	let { cta = DEFAULT_LANDING.finalCta }: { cta?: LandingFinalCta } = $props();
</script>

<section class="mx-auto w-full max-w-7xl px-4 pt-12 pb-24 sm:px-6">
	<div
		class="reveal relative isolate overflow-hidden rounded-[2.5rem] bg-surface-dark px-6 py-20 text-center text-surface-dark-foreground sm:px-12"
		style:--reveal-scale="0.96"
		{@attach inView()}
	>
		<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
			<div
				class="glow absolute -bottom-2/3 left-1/2 size-[50rem] -translate-x-1/2 opacity-50"
				style:--glow-color="#1d6fe0"
			></div>
			<!-- A planet's limb rising from the bottom edge, echoing the hero's globe. -->
			<div
				class="absolute -bottom-[85%] left-1/2 aspect-square w-[140%] -translate-x-1/2 rounded-full border border-sky-300/30 shadow-[0_-20px_80px_-10px_rgb(124_196_255/0.45)_inset]"
			></div>
			<div
				class="absolute inset-0 opacity-40"
				style="background-image: radial-gradient(rgb(255 255 255 / 0.14) 1px, transparent 1px); background-size: 26px 26px; mask-image: radial-gradient(ellipse at top, #000 20%, transparent 70%)"
			></div>
		</div>
		<h2 class="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
			<span class="text-gradient-ice">{cta.heading}</span>
		</h2>
		<p class="mx-auto mt-5 max-w-xl text-lg text-slate-400">{cta.description}</p>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an editor-set path or https link -->
		<a
			href={cmsHref(cta.ctaUrl)}
			class="group mt-9 inline-flex h-13 items-center gap-2 rounded-2xl bg-white px-7 text-base font-semibold text-[#0b2a5c] shadow-[0_0_40px_rgb(124_196_255/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgb(124_196_255/0.7)]"
		>
			{cta.ctaText}
			<ArrowRight class="size-4 transition-transform group-hover:translate-x-1" />
		</a>
	</div>
</section>
