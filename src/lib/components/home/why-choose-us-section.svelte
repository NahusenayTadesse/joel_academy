<script lang="ts">
	import { inView } from '$lib/attachments';
	import { DEFAULT_LANDING, type LandingIconItem } from '$lib/content/landing';
	import { landingIcon } from './landing-icons';
	import { m } from '$lib/paraglide/messages';
	import SectionTitle from './section-title.svelte';

	let { items = DEFAULT_LANDING.whyChooseUs }: { items?: LandingIconItem[] } = $props();
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
	<SectionTitle
		eyebrow={m.home_why_eyebrow()}
		title={m.home_why_title()}
		accent={m.home_why_accent()}
		subtitle={m.home_why_subtitle()}
		align="center"
	/>
	<div class="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" {@attach inView()}>
		{#each items as feature, index (index)}
			{@const Icon = landingIcon(feature.icon)}
			<div class="glass-card lift gradient-border group flex flex-col gap-4 rounded-3xl p-6">
				<span
					class="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-brand-ink ring-1 ring-primary/15 transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground"
				>
					<Icon class="size-5" aria-hidden="true" />
				</span>
				<h3 class="text-lg font-semibold text-foreground">{feature.title}</h3>
				<p class="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
			</div>
		{/each}
	</div>
</section>
