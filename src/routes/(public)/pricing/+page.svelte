<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Gift from '@lucide/svelte/icons/gift';
	import InfinityIcon from '@lucide/svelte/icons/infinity';
	import Tag from '@lucide/svelte/icons/tag';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import FaqAccordion from '$lib/components/marketing/faq-accordion.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const PRICING_FAQ = [
		{
			question: 'Do you offer subscriptions?',
			answer: 'No. Every course is priced individually and paid for once, with lifetime access.'
		},
		{
			question: 'Are there really free courses?',
			answer: 'Yes - many courses are free to enroll in and complete, no payment required.'
		},
		{
			question: 'What payment methods are supported?',
			answer: 'Payment options are shown at checkout when you enroll in a paid course.'
		}
	];
</script>

<svelte:head>
	<title>Pricing · {siteConfig.name}</title>
	<meta
		name="description"
		content="How pricing works on our platform - simple, one-time, per-course pricing."
	/>
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6">
	<PageHeader
		title="Pricing"
		description="No subscriptions or hidden fees - just simple, one-time, per-course pricing."
	/>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
		<Card class="flex flex-col gap-3 p-6">
			<span
				class="flex size-11 items-center justify-center rounded-full bg-success/10 text-success-ink"
			>
				<Gift class="size-5" />
			</span>
			<h2 class="text-base font-semibold text-foreground">Free courses</h2>
			<p class="text-sm text-muted-foreground">
				{data.freeCount} free {data.freeCount === 1 ? 'course is' : 'courses are'} available right
				now, with no payment required.
			</p>
		</Card>
		<Card class="flex flex-col gap-3 p-6">
			<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<Tag class="size-5" />
			</span>
			<h2 class="text-base font-semibold text-foreground">Paid courses</h2>
			<p class="text-sm text-muted-foreground">
				{data.paidCount} paid {data.paidCount === 1 ? 'course' : 'courses'}{data.priceRange
					? `, ranging from ${data.priceRange.lowest} to ${data.priceRange.highest}.`
					: '.'}
			</p>
		</Card>
		<Card class="flex flex-col gap-3 p-6">
			<span class="flex size-11 items-center justify-center rounded-full bg-info/10 text-info">
				<InfinityIcon class="size-5" />
			</span>
			<h2 class="text-base font-semibold text-foreground">Lifetime access</h2>
			<p class="text-sm text-muted-foreground">
				Once you enroll, the course is yours to revisit any time, with no expiration.
			</p>
		</Card>
	</div>

	<div class="flex justify-center">
		<Button size="lg" href={ROUTES.courses.list}>
			Browse courses
			<ArrowRight class="size-4" />
		</Button>
	</div>

	<div class="mx-auto w-full max-w-2xl">
		<h2 class="mb-4 text-center text-xl font-semibold text-foreground">Pricing FAQ</h2>
		<FaqAccordion items={PRICING_FAQ} />
	</div>
</div>
