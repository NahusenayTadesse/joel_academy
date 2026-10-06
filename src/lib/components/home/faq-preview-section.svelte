<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import FaqAccordion from '$lib/components/marketing/faq-accordion.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { DEFAULT_LANDING, type LandingFaq } from '$lib/content/landing';
	import { ROUTES } from '$lib/site';

	let { items = DEFAULT_LANDING.faqs }: { items?: LandingFaq[] } = $props();

	const displayItems = $derived(items.slice(0, 4));
</script>

<section class="border-t border-border bg-muted/20">
	<div class="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
		<div class="mb-8 text-center">
			<h2 class="text-2xl font-semibold tracking-tight text-foreground">
				Frequently asked questions
			</h2>
		</div>
		<FaqAccordion items={displayItems} />
		<div class="mt-8 flex justify-center">
			<Button href={ROUTES.faq} variant="ghost">
				View all FAQs
				<ArrowRight class="size-4" />
			</Button>
		</div>
	</div>
</section>
