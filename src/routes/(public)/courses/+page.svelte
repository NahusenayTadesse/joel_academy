<script lang="ts">
	import PageHeader from '$lib/components/common/page-header.svelte';
	import CourseFilters from '$lib/components/courses/course-filters.svelte';
	import CoursesGrid from '$lib/components/courses/courses-grid.svelte';
	import { jsonLdScript } from '$lib/json-ld';
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	// Kept here so it survives filter navigations, like the original's shared view store.
	let view = $state<'grid' | 'list'>('grid');
</script>

<svelte:head>
	<title>Browse Courses · {siteConfig.name}</title>
	<meta
		name="description"
		content="Explore the full course catalog — filter by category, level, and price."
	/>
	{#if data.itemListJsonLd}
		{@html jsonLdScript(data.itemListJsonLd)}
	{/if}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageHeader
		title="Browse courses"
		description="Explore our full catalog and find the course that fits your goals."
	/>
	<CourseFilters query={data.query} categories={data.categories} bind:view />
	<CoursesGrid courses={data.courses} query={data.query} {view} />
</div>
