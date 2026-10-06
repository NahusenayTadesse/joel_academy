<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CategoryCard from '$lib/components/catalog/category-card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import type { Category } from '$lib/content/catalog.types';
	import { ROUTES } from '$lib/site';

	let { categories }: { categories: Category[] } = $props();
</script>

{#if categories.length > 0}
	<section class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
		<div class="mb-8 flex items-end justify-between gap-4">
			<div>
				<h2 class="text-2xl font-semibold tracking-tight text-foreground">Popular categories</h2>
				<p class="mt-1 text-sm text-muted-foreground">Find courses organized by subject area.</p>
			</div>
			<Button href={ROUTES.categories.list} variant="ghost" class="hidden sm:inline-flex">
				View all
				<ArrowRight class="size-4" />
			</Button>
		</div>
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each categories as category (category.id)}
				<CategoryCard {category} />
			{/each}
		</div>
	</section>
{/if}
