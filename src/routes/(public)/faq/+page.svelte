<script lang="ts">
	import PageHeader from '$lib/components/common/page-header.svelte';
	import FaqAccordion from '$lib/components/marketing/faq-accordion.svelte';
	import { siteConfig } from '$lib/site';

	let { data } = $props();
</script>

<svelte:head>
	<title>Frequently Asked Questions · {siteConfig.name}</title>
	<meta
		name="description"
		content="Answers to common questions about courses, enrollment, and your account."
	/>
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageHeader title="Frequently asked questions" description="Answers to common questions." />
	<FaqAccordion items={data.faqs} />
</div>
