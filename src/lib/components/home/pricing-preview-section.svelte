<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Gift from '@lucide/svelte/icons/gift';
	import Tag from '@lucide/svelte/icons/tag';
	import Button from '$lib/components/ui/button.svelte';
	import { inView } from '$lib/attachments';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import SectionTitle from './section-title.svelte';
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
	<SectionTitle
		eyebrow={m.home_pricing_eyebrow()}
		title={m.home_pricing_title()}
		accent={m.home_pricing_accent()}
		subtitle={m.home_pricing_subtitle()}
		align="center"
	/>
	<div class="reveal-stagger mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2" {@attach inView()}>
		<div class="glass-card lift flex flex-col gap-3 rounded-3xl p-7">
			<span class="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success-ink">
				<Gift class="size-5" />
			</span>
			<h3 class="text-lg font-semibold text-foreground">{m.home_pricing_free_title()}</h3>
			<p class="text-sm leading-relaxed text-muted-foreground">
				{m.home_pricing_free_description()}
			</p>
		</div>
		<div class="glass-card lift gradient-border flex flex-col gap-3 rounded-3xl p-7">
			<span
				class="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to text-primary-foreground shadow-glow"
			>
				<Tag class="size-5" />
			</span>
			<h3 class="text-lg font-semibold text-foreground">{m.home_pricing_paid_title()}</h3>
			<p class="text-sm leading-relaxed text-muted-foreground">
				{m.home_pricing_paid_description()}
			</p>
		</div>
	</div>
	<div class="mt-10 flex justify-center">
		<Button href={ROUTES.pricing} variant="glass">
			{m.home_pricing_link()}
			<ArrowRight class="size-4" />
		</Button>
	</div>
</section>
