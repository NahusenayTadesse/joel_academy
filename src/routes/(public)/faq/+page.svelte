<script lang="ts">
	import PageHeader from '$lib/components/common/page-header.svelte';
	import FaqAccordion from '$lib/components/marketing/faq-accordion.svelte';
	import { m } from '$lib/paraglide/messages';
	import { siteConfig } from '$lib/site';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.info_faq_meta_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.info_faq_meta_description()} />
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageHeader title={m.info_faq_title()} description={m.info_faq_description()} />
	<FaqAccordion items={data.faqs} />
</div>
