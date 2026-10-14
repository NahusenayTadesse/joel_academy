<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Gift from '@lucide/svelte/icons/gift';
	import Tag from '@lucide/svelte/icons/tag';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { ROUTES } from '$lib/site';
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
	<div class="mb-8 text-center">
		<h2 class="text-2xl font-semibold tracking-tight text-foreground">Simple, per-course pricing</h2>
		<p class="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
			No subscriptions. Pay once for a course and keep lifetime access.
		</p>
	</div>
	<div class="mx-auto grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
		<Card class="flex flex-col gap-3 p-6">
			<span class="flex size-11 items-center justify-center rounded-full bg-success/10 text-success-ink">
				<Gift class="size-5" />
			</span>
			<h3 class="text-base font-semibold text-foreground">Free courses</h3>
			<p class="text-sm text-muted-foreground">
				Many courses are completely free to enroll in and complete.
			</p>
		</Card>
		<Card class="flex flex-col gap-3 p-6">
			<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<Tag class="size-5" />
			</span>
			<h3 class="text-base font-semibold text-foreground">Paid courses</h3>
			<p class="text-sm text-muted-foreground">
				Pay a one-time price set by the instructor for lifetime access, no recurring fees.
			</p>
		</Card>
	</div>
	<div class="mt-8 flex justify-center">
		<Button href={ROUTES.pricing} variant="outline">
			Learn more about pricing
			<ArrowRight class="size-4" />
		</Button>
	</div>
</section>
