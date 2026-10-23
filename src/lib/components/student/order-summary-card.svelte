<script lang="ts">
	import CourseThumbnail from '$lib/components/catalog/course-thumbnail.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { formatCurrency } from '$lib/format';
	import { m } from '$lib/paraglide/messages';

	/*
	 * The original order summary. With a promo code applied, every figure on it is the server's
	 * quote for that code, never worked out here.
	 */
	let {
		course,
		promo = null
	}: {
		course: {
			title: string;
			presenterName: string;
			thumbnailUrl?: string | null;
			categoryName?: string;
			categorySlug?: string;
			price: string;
			total: string;
			currency: string;
		};
		promo?: { code: string; discountAmount: string; amountDue: string } | null;
	} = $props();

	const total = $derived(promo ? promo.amountDue : course.total);
</script>

<Card class="sticky top-24">
	<div class="flex flex-col space-y-1.5 p-6">
		<h3 class="text-base leading-none font-semibold tracking-tight">{m.account_order_summary()}</h3>
	</div>
	<CardContent class="space-y-4">
		<div class="flex gap-3">
			<CourseThumbnail
				title={course.title}
				categoryName={course.categoryName}
				categorySlug={course.categorySlug}
				thumbnailUrl={course.thumbnailUrl}
				showBadge={false}
				class="aspect-square w-16 shrink-0 rounded-lg"
			/>
			<div class="min-w-0">
				<p class="line-clamp-2 text-sm font-semibold text-foreground">{course.title}</p>
				<p class="text-xs text-muted-foreground">{course.presenterName}</p>
			</div>
		</div>

		<div class="h-px w-full shrink-0 bg-border"></div>

		<dl class="space-y-2 text-sm">
			<div class="flex items-center justify-between">
				<dt class="text-muted-foreground">{m.account_course_price()}</dt>
				<dd class="font-medium text-foreground">{formatCurrency(course.price, course.currency)}</dd>
			</div>
			{#if Number(course.total) < Number(course.price)}
				<div class="flex items-center justify-between text-success-ink">
					<dt>{m.account_discount()}</dt>
					<dd>-{formatCurrency(Number(course.price) - Number(course.total), course.currency)}</dd>
				</div>
			{/if}
			{#if promo}
				<div class="flex items-center justify-between text-success-ink">
					<dt>{m.account_promo_with_code({ code: promo.code })}</dt>
					<dd>-{formatCurrency(promo.discountAmount, course.currency)}</dd>
				</div>
			{/if}
		</dl>

		<div class="h-px w-full shrink-0 bg-border"></div>

		<div class="flex items-center justify-between">
			<span class="text-sm font-semibold text-foreground">{m.account_total()}</span>
			<span class="text-lg font-bold text-brand-ink">
				{Number(total) <= 0 ? m.account_free() : formatCurrency(total, course.currency)}
			</span>
		</div>
	</CardContent>
</Card>
