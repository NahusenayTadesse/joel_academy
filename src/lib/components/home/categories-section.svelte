<script lang="ts">
	import CategoryCard from '$lib/components/catalog/category-card.svelte';
	import { inView } from '$lib/attachments';
	import type { Category } from '$lib/content/catalog.types';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import SectionTitle from './section-title.svelte';

	let { categories }: { categories: Category[] } = $props();
</script>

{#if categories.length > 0}
	<section class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
		<SectionTitle
			eyebrow={m.home_categories_eyebrow()}
			title={m.home_categories_title()}
			accent={m.home_categories_accent()}
			subtitle={m.home_categories_subtitle()}
			link={{ href: ROUTES.categories.list, label: m.home_categories_link() }}
		/>
		<div class="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" {@attach inView()}>
			{#each categories as category (category.id)}
				<CategoryCard {category} />
			{/each}
		</div>
	</section>
{/if}
