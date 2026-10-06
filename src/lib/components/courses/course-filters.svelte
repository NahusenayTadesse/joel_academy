<script lang="ts">
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import List from '@lucide/svelte/icons/list';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Button from '$lib/components/ui/button.svelte';
	import {
		DEFAULT_CATALOG_FILTERS,
		DEFAULT_PAGE_SIZE,
		DIFFICULTY_LABELS,
		SORT_LABELS,
		type CatalogFilters
	} from '$lib/content/catalog.constants';
	import type { CatalogQuery } from './catalog-query';
	import { navigateCatalog } from './catalog-navigation';
	import SearchBar from './search-bar.svelte';
	import Select from './select.svelte';

	const ALL_VALUE = 'all';

	let {
		query,
		categories,
		view = $bindable('grid')
	}: {
		query: CatalogQuery;
		categories: { id: string; name: string }[];
		/** Grid/list is a presentation preference, not filter state, so it stays out of the URL. */
		view?: 'grid' | 'list';
	} = $props();

	const filters = $derived(query.filters);

	const hasActiveFilters = $derived(
		Boolean(
			filters.search ||
				filters.categoryId ||
				filters.accessType ||
				filters.difficulty ||
				filters.sort !== 'newest'
		)
	);

	const categoryOptions = $derived([
		{ value: ALL_VALUE, label: 'All categories' },
		...categories.map((category) => ({ value: category.id, label: category.name }))
	]);
	const accessOptions = [
		{ value: ALL_VALUE, label: 'Free & Paid' },
		{ value: 'FREE', label: 'Free' },
		{ value: 'PAID', label: 'Paid' }
	];
	const difficultyOptions = [
		{ value: ALL_VALUE, label: 'All levels' },
		...Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))
	];
	const sortOptions = Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }));

	/** Any filter change returns to the first page. */
	function setFilter(key: keyof CatalogFilters, value: string | undefined) {
		navigateCatalog({ filters: { ...filters, [key]: value }, page: 1, pageSize: query.pageSize });
	}

	const fromSelect = (value: string) => (value === ALL_VALUE ? undefined : value);

	function resetFilters() {
		navigateCatalog({ filters: DEFAULT_CATALOG_FILTERS, page: 1, pageSize: DEFAULT_PAGE_SIZE });
	}
</script>

<div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
	<SearchBar
		placeholder="Search courses…"
		value={filters.search ?? ''}
		onSearch={(value) => setFilter('search', value || undefined)}
		aria-label="Search courses"
	/>

	<div class="flex flex-wrap items-center gap-3">
		<Select
			value={filters.categoryId ?? ALL_VALUE}
			items={categoryOptions}
			placeholder="Category"
			onValueChange={(value) => setFilter('categoryId', fromSelect(value))}
			class="w-[180px]"
		/>

		<Select
			value={filters.accessType ?? ALL_VALUE}
			items={accessOptions}
			placeholder="Access"
			onValueChange={(value) => setFilter('accessType', fromSelect(value))}
			class="w-[140px]"
		/>

		<Select
			value={filters.difficulty ?? ALL_VALUE}
			items={difficultyOptions}
			placeholder="Level"
			onValueChange={(value) => setFilter('difficulty', fromSelect(value))}
			class="w-[160px]"
		/>

		<Select
			value={filters.sort ?? 'newest'}
			items={sortOptions}
			placeholder="Sort by"
			onValueChange={(value) => setFilter('sort', value)}
			class="w-[180px]"
		/>

		{#if hasActiveFilters}
			<Button variant="ghost" size="sm" onclick={resetFilters}>
				<RotateCcw class="size-3.5" />
				Reset
			</Button>
		{/if}

		<div class="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
			<Button
				type="button"
				variant={view === 'grid' ? 'secondary' : 'ghost'}
				size="icon"
				class="size-8"
				aria-label="Grid view"
				aria-pressed={view === 'grid'}
				onclick={() => (view = 'grid')}
			>
				<LayoutGrid class="size-4" />
			</Button>
			<Button
				type="button"
				variant={view === 'list' ? 'secondary' : 'ghost'}
				size="icon"
				class="size-8"
				aria-label="List view"
				aria-pressed={view === 'list'}
				onclick={() => (view = 'list')}
			>
				<List class="size-4" />
			</Button>
		</div>
	</div>
</div>
