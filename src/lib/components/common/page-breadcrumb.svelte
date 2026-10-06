<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { BreadcrumbEntry } from '$lib/json-ld';

	/* The original `PageBreadcrumb` (shadcn breadcrumb) markup and classes. */
	let { items }: { items: BreadcrumbEntry[] } = $props();
</script>

<nav aria-label="breadcrumb">
	<ol
		class="flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5"
	>
		{#each items as item, index (item.label)}
			{#if index > 0}
				<li role="presentation" aria-hidden="true" class="[&>svg]:h-3.5 [&>svg]:w-3.5">
					<ChevronRight />
				</li>
			{/if}
			<li class="inline-flex items-center gap-1.5">
				{#if item.href}
					<a href={item.href} class="transition-colors hover:text-foreground">{item.label}</a>
				{:else}
					<span
						role="link"
						aria-disabled="true"
						aria-current="page"
						class="font-normal text-foreground">{item.label}</span
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
