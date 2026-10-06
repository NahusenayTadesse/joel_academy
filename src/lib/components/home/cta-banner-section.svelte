<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/button.svelte';
	import { DEFAULT_LANDING, type LandingFinalCta } from '$lib/content/landing';

	let { cta = DEFAULT_LANDING.finalCta }: { cta?: LandingFinalCta } = $props();
</script>

<section class="bg-surface-dark text-surface-dark-foreground">
	<div
		class="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6"
	>
		<h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">{cta.heading}</h2>
		<p class="max-w-xl text-slate-400">{cta.description}</p>
		<Button href={cta.ctaUrl} size="lg" class="mt-2 bg-chart-1 text-surface-dark hover:bg-chart-1/90">
			{cta.ctaText}
			<ArrowRight class="size-4" />
		</Button>
	</div>
</section>
