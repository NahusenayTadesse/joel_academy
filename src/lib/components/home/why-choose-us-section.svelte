<script lang="ts">
	import FeatureCard from '$lib/components/marketing/feature-card.svelte';
	import { DEFAULT_LANDING, type LandingIconItem } from '$lib/content/landing';
	import { landingIcon } from './landing-icons';

	let { items = DEFAULT_LANDING.whyChooseUs }: { items?: LandingIconItem[] } = $props();
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
	<div class="mb-8 text-center">
		<h2 class="text-2xl font-semibold tracking-tight text-foreground">Why Choose the Academy</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Everything you need to learn effectively, in one place.
		</p>
	</div>
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
		{#each items as feature, index (index)}
			<FeatureCard
				icon={landingIcon(feature.icon)}
				title={feature.title}
				description={feature.description}
			/>
		{/each}
	</div>
</section>
