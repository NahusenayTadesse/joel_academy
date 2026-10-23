<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Gift from '@lucide/svelte/icons/gift';
	import InfinityIcon from '@lucide/svelte/icons/infinity';
	import Tag from '@lucide/svelte/icons/tag';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import FaqAccordion from '$lib/components/marketing/faq-accordion.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const PRICING_FAQ = $derived([
		{ question: m.catalog_pricing_faq_q1(), answer: m.catalog_pricing_faq_a1() },
		{ question: m.catalog_pricing_faq_q2(), answer: m.catalog_pricing_faq_a2() },
		{ question: m.catalog_pricing_faq_q3(), answer: m.catalog_pricing_faq_a3() }
	]);
</script>

<svelte:head>
	<title>{m.catalog_pricing_title()} · {siteConfig.name}</title>
	<meta
		name="description"
		content={m.catalog_pricing_meta_description()}
	/>
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6">
	<PageHeader
		title={m.catalog_pricing_title()}
		description={m.catalog_pricing_description()}
	/>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
		<Card class="flex flex-col gap-3 p-6">
			<span
				class="flex size-11 items-center justify-center rounded-full bg-success/10 text-success-ink"
			>
				<Gift class="size-5" />
			</span>
			<h2 class="text-base font-semibold text-foreground">{m.catalog_pricing_free_heading()}</h2>
			<p class="text-sm text-muted-foreground">
				{m.catalog_pricing_free_body({ count: data.freeCount })}
			</p>
		</Card>
		<Card class="flex flex-col gap-3 p-6">
			<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<Tag class="size-5" />
			</span>
			<h2 class="text-base font-semibold text-foreground">{m.catalog_pricing_paid_heading()}</h2>
			<p class="text-sm text-muted-foreground">
				{data.priceRange
					? m.catalog_pricing_paid_body_range({
							count: data.paidCount,
							lowest: data.priceRange.lowest,
							highest: data.priceRange.highest
						})
					: m.catalog_pricing_paid_body({ count: data.paidCount })}
			</p>
		</Card>
		<Card class="flex flex-col gap-3 p-6">
			<span class="flex size-11 items-center justify-center rounded-full bg-info/10 text-info">
				<InfinityIcon class="size-5" />
			</span>
			<h2 class="text-base font-semibold text-foreground">{m.catalog_pricing_lifetime_heading()}</h2>
			<p class="text-sm text-muted-foreground">
				{m.catalog_pricing_lifetime_body()}
			</p>
		</Card>
	</div>

	<div class="flex justify-center">
		<Button size="lg" href={ROUTES.courses.list}>
			{m.catalog_courses_title()}
			<ArrowRight class="size-4" />
		</Button>
	</div>

	<div class="mx-auto w-full max-w-2xl">
		<h2 class="mb-4 text-center text-xl font-semibold text-foreground">{m.catalog_pricing_faq_heading()}</h2>
		<FaqAccordion items={PRICING_FAQ} />
	</div>
</div>
