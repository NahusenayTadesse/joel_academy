<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import FaqAccordion from '$lib/components/marketing/faq-accordion.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { DEFAULT_LANDING, type LandingFaq } from '$lib/content/landing';
	import { ROUTES } from '$lib/site';
	import { inView } from '$lib/attachments';
	import SectionTitle from './section-title.svelte';

	let { items = DEFAULT_LANDING.faqs }: { items?: LandingFaq[] } = $props();

	const displayItems = $derived(items.slice(0, 4));
</script>

<section>
	<div class="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
		<SectionTitle eyebrow="FAQ" title="Questions," accent="answered" align="center" />
		<div class="reveal" {@attach inView()}>
			<FaqAccordion items={displayItems} />
		</div>
		<div class="mt-10 flex justify-center">
			<Button href={ROUTES.faq} variant="glass">
				View all FAQs
				<ArrowRight class="size-4" />
			</Button>
		</div>
	</div>
</section>
