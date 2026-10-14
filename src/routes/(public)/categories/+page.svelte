<script lang="ts">
	import Layers from '@lucide/svelte/icons/layers';
	import { page } from '$app/state';
	import CategoryCard from '$lib/components/catalog/category-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import { buildItemListJsonLd, jsonLdScript } from '$lib/json-ld';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const jsonLd = $derived(
		buildItemListJsonLd(
			page.url.origin,
			data.categories.map((category) => ({
				name: category.name,
				url: ROUTES.categories.detail(category.slug)
			}))
		)
	);
</script>

<svelte:head>
	<title>Categories · {siteConfig.name}</title>
	<meta name="description" content="Browse courses by category." />
	{#if data.categories.length > 0}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialized JSON with `<` escaped -->
		{@html jsonLdScript(jsonLd)}
	{/if}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageHeader title="Categories" description="Find courses organized by subject area." />
	{#if data.categories.length === 0}
		<EmptyState icon={Layers} title="No categories yet" />
	{:else}
		<h2 class="sr-only">All categories</h2>
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.categories as category (category.id)}
				<CategoryCard {category} />
			{/each}
		</div>
	{/if}
</div>
