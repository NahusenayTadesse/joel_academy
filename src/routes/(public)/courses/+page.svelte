<script lang="ts">
	import PageHeader from '$lib/components/common/page-header.svelte';
	import CourseFilters from '$lib/components/courses/course-filters.svelte';
	import CoursesGrid from '$lib/components/courses/courses-grid.svelte';
	import { jsonLdScript } from '$lib/json-ld';
	import { m } from '$lib/paraglide/messages';
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	// Kept here so it survives filter navigations, like the original's shared view store.
	let view = $state<'grid' | 'list'>('grid');
</script>

<svelte:head>
	<title>{m.catalog_courses_meta_title()} · {siteConfig.name}</title>
	<meta
		name="description"
		content={m.catalog_courses_meta_description()}
	/>
	{#if data.itemListJsonLd}
		{@html jsonLdScript(data.itemListJsonLd)}
	{/if}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageHeader
		title={m.catalog_courses_title()}
		description={m.catalog_courses_description()}
	/>
	<CourseFilters query={data.query} categories={data.categories} bind:view />
	<h2 class="sr-only">{m.catalog_courses_sr_heading()}</h2>
	<CoursesGrid courses={data.courses} query={data.query} {view} />
</div>
