<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Layers from '@lucide/svelte/icons/layers';
	import Card from '$lib/components/ui/card.svelte';
	import type { Category } from '$lib/content/catalog.types';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		category,
		courseCount,
		class: className = ''
	}: { category: Category; courseCount?: number; class?: string } = $props();
</script>

<Card class={cn('group overflow-hidden transition-shadow hover:shadow-md', className)}>
	<a href={ROUTES.categories.detail(category.slug)} class="flex flex-col gap-3 p-5">
		<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
			<Layers class="size-5" aria-hidden="true" />
		</span>
		<div class="flex items-center justify-between gap-2">
			<h3 class="text-sm font-semibold text-foreground group-hover:text-brand">{category.name}</h3>
			<ArrowRight
				class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
			/>
		</div>
		{#if category.description}
			<p class="line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
		{/if}
		{#if typeof courseCount === 'number'}
			<p class="text-xs text-muted-foreground">
				{courseCount}
				{courseCount === 1 ? 'course' : 'courses'}
			</p>
		{/if}
	</a>
</Card>
