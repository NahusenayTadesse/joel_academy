<script lang="ts">
	import SearchX from '@lucide/svelte/icons/search-x';
	import { page } from '$app/state';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PublicPagination from '$lib/components/common/public-pagination.svelte';
	import { buildBreadcrumbJsonLd, jsonLdScript } from '$lib/json-ld';
	import { m } from '$lib/paraglide/messages';
	import PageBreadcrumb from '$lib/components/common/page-breadcrumb.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const breadcrumbItems = $derived([
		{ label: m.catalog_breadcrumb_home(), href: ROUTES.home },
		{ label: m.catalog_breadcrumb_categories(), href: ROUTES.categories.list },
		{ label: data.category.name }
	]);
</script>

<svelte:head>
	<title>{data.category.name} · {siteConfig.name}</title>
	<meta
		name="description"
		content={data.category.description ?? m.catalog_category_meta_fallback({ name: data.category.name })}
	/>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialized JSON with `<` escaped -->
	{@html jsonLdScript(buildBreadcrumbJsonLd(page.url.origin, breadcrumbItems))}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
	<PageBreadcrumb items={breadcrumbItems} />

	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{data.category.name}</h1>
		{#if data.category.description}
			<p class="text-sm text-muted-foreground">{data.category.description}</p>
		{/if}
	</div>

	{#if data.courses.items.length === 0}
		<EmptyState icon={SearchX} title={m.catalog_category_empty()} />
	{:else}
		<div class="flex flex-col gap-6">
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each data.courses.items as course (course.id)}
					<CourseCard {course} />
				{/each}
			</div>
			<PublicPagination
				page={data.page}
				totalPages={data.totalPages}
				basePath={ROUTES.categories.detail(data.category.slug)}
			/>
		</div>
	{/if}
</div>
