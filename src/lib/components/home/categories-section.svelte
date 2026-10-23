<script lang="ts">
	import CategoryCard from '$lib/components/catalog/category-card.svelte';
	import { inView } from '$lib/attachments';
	import type { Category } from '$lib/content/catalog.types';
	import { ROUTES } from '$lib/site';
	import SectionTitle from './section-title.svelte';

	let { categories }: { categories: Category[] } = $props();
</script>

{#if categories.length > 0}
	<section class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
		<SectionTitle
			eyebrow="Explore"
			title="Popular"
			accent="categories"
			subtitle="Find courses organized by subject area."
			link={{ href: ROUTES.categories.list, label: 'View all categories' }}
		/>
		<div class="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" {@attach inView()}>
			{#each categories as category (category.id)}
				<CategoryCard {category} />
			{/each}
		</div>
	</section>
{/if}
