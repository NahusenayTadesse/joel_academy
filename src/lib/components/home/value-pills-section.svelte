<script lang="ts">
	import { inView } from '$lib/attachments';
	import { DEFAULT_LANDING, type LandingIconItem } from '$lib/content/landing';
	import { landingIcon } from './landing-icons';

	let { items = DEFAULT_LANDING.valuePills }: { items?: LandingIconItem[] } = $props();
</script>

<section class="relative z-10 mx-auto -mt-8 w-full max-w-7xl px-4 sm:px-6">
	<div
		class="glass-card reveal-stagger grid grid-cols-1 gap-px overflow-hidden rounded-3xl sm:grid-cols-3"
		{@attach inView()}
	>
		{#each items as value, index (index)}
			{@const Icon = landingIcon(value.icon)}
			<div class="group flex items-start gap-4 p-6 transition-colors hover:bg-primary/5">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to text-primary-foreground shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
				>
					<Icon class="size-5" />
				</span>
				<div>
					<h2 class="text-sm font-semibold text-foreground">{value.title}</h2>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
				</div>
			</div>
		{/each}
	</div>
</section>
