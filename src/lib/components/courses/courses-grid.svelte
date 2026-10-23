<script lang="ts">
	import SearchX from '@lucide/svelte/icons/search-x';
	import { navigating, page } from '$app/state';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import { DEFAULT_CATALOG_FILTERS, DEFAULT_PAGE_SIZE } from '$lib/content/catalog.constants';
	import type { CourseListResult } from '$lib/content/catalog.types';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { catalogHref, type CatalogQuery } from './catalog-query';
	import { navigateCatalog } from './catalog-navigation';
	import CoursesPagination from './courses-pagination.svelte';

	let {
		courses,
		query,
		view = 'grid',
		linkBase
	}: {
		courses: CourseListResult;
		query: CatalogQuery;
		view?: 'grid' | 'list';
		/** Overrides `CourseCard`'s default public link target, e.g. for a dashboard course route. */
		linkBase?: string;
	} = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(courses.total / query.pageSize)));
	const isLoading = $derived(navigating.to?.url.pathname === page.url.pathname);

	function resetFilters() {
		navigateCatalog({ filters: DEFAULT_CATALOG_FILTERS, page: 1, pageSize: DEFAULT_PAGE_SIZE });
	}
</script>

{#if courses.items.length === 0}
	<EmptyState
		icon={SearchX}
		title={query.filters.search
			? m.catalog_grid_none_for({ search: query.filters.search })
			: m.catalog_grid_none()}
		description={m.catalog_grid_none_hint()}
	>
		{#snippet action()}
			<button
				type="button"
				onclick={resetFilters}
				class="text-sm font-medium text-brand-ink underline-offset-4 hover:underline"
			>
				{m.catalog_grid_reset_filters()}
			</button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="flex flex-col gap-6">
		<div
			class={cn(
				view === 'grid'
					? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
					: 'flex flex-col gap-4'
			)}
		>
			{#each courses.items as course, index (course.id)}
				<!--
					The first card is the page's main image. The rest load lazily: on a phone they are below
					the fold and would compete with it for bandwidth; on a wide screen the browser still loads
					the ones in view straight away.
				-->
				<CourseCard
					{course}
					{view}
					priority={index === 0 ? 'high' : 'lazy'}
					href={linkBase ? `${linkBase}/${course.slug}` : undefined}
				/>
			{/each}
		</div>
		<CoursesPagination
			page={query.page}
			{totalPages}
			{isLoading}
			href={(target) => catalogHref({ ...query, page: target }, page.url.pathname)}
		/>
	</div>
{/if}
