<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Gift from '@lucide/svelte/icons/gift';
	import Tag from '@lucide/svelte/icons/tag';
	import Button from '$lib/components/ui/button.svelte';
	import { inView } from '$lib/attachments';
	import { ROUTES } from '$lib/site';
	import SectionTitle from './section-title.svelte';
</script>

<section class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
	<SectionTitle
		eyebrow="Pricing"
		title="Simple,"
		accent="per-course pricing"
		subtitle="No subscriptions. Pay once for a course and keep lifetime access."
		align="center"
	/>
	<div class="reveal-stagger mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2" {@attach inView()}>
		<div class="glass-card lift flex flex-col gap-3 rounded-3xl p-7">
			<span class="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success-ink">
				<Gift class="size-5" />
			</span>
			<h3 class="text-lg font-semibold text-foreground">Free courses</h3>
			<p class="text-sm leading-relaxed text-muted-foreground">
				Many courses are completely free to enroll in and complete.
			</p>
		</div>
		<div class="glass-card lift gradient-border flex flex-col gap-3 rounded-3xl p-7">
			<span
				class="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-gradient-from to-brand-gradient-to text-primary-foreground shadow-glow"
			>
				<Tag class="size-5" />
			</span>
			<h3 class="text-lg font-semibold text-foreground">Paid courses</h3>
			<p class="text-sm leading-relaxed text-muted-foreground">
				Pay a one-time price set by the instructor for lifetime access, no recurring fees.
			</p>
		</div>
	</div>
	<div class="mt-10 flex justify-center">
		<Button href={ROUTES.pricing} variant="glass">
			Learn more about pricing
			<ArrowRight class="size-4" />
		</Button>
	</div>
</section>
