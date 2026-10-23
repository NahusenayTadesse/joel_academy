<script lang="ts">
	import UserRound from '@lucide/svelte/icons/user-round';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import InstructorCard from '$lib/components/instructors/instructor-card.svelte';
	import { buildItemListJsonLd, jsonLdScript } from '$lib/json-ld';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const itemListEntries = $derived(
		data.instructors.map((instructor) => ({
			name: instructor.name,
			url: ROUTES.instructors.detail(encodeURIComponent(instructor.name))
		}))
	);
</script>

<svelte:head>
	<title>{m.catalog_instructors_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.catalog_instructors_meta_description()} />
	{#if itemListEntries.length > 0}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialized JSON with `<` escaped -->
		{@html jsonLdScript(buildItemListJsonLd(page.url.origin, itemListEntries))}
	{/if}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageHeader title={m.catalog_instructors_title()} description={m.catalog_instructors_description()} />
	{#if data.instructors.length === 0}
		<EmptyState icon={UserRound} title={m.catalog_instructors_empty()} />
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
			{#each data.instructors as instructor (instructor.name)}
				<InstructorCard {instructor} />
			{/each}
		</div>
	{/if}
</div>
