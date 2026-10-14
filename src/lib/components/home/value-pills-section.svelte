<script lang="ts">
	import { DEFAULT_LANDING, type LandingIconItem } from '$lib/content/landing';
	import { landingIcon } from './landing-icons';

	let { items = DEFAULT_LANDING.valuePills }: { items?: LandingIconItem[] } = $props();
</script>

<section class="border-b border-border bg-background">
	<div class="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
		{#each items as value, index (index)}
			{@const Icon = landingIcon(value.icon)}
			<div class="flex items-start gap-3">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground"
				>
					<Icon class="size-5" />
				</span>
				<div>
					<h2 class="text-sm font-semibold text-foreground">{value.title}</h2>
					<p class="mt-0.5 text-sm text-muted-foreground">{value.description}</p>
				</div>
			</div>
		{/each}
	</div>
</section>
