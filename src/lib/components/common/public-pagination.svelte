<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { buttonVariants } from '$lib/components/ui/variants';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		page,
		totalPages,
		basePath,
		href: buildHref = (target: number) => (target <= 1 ? basePath : `${basePath}?page=${target}`),
		class: className = ''
	}: {
		page: number;
		totalPages: number;
		basePath: string;
		/** Overrides the default `?page=` link, e.g. to keep other query parameters. */
		href?: (page: number) => string;
		class?: string;
	} = $props();

	function buildPageRange(current: number, total: number): (number | 'ellipsis')[] {
		if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
		const left = Math.max(current - 1, 1);
		const right = Math.min(current + 1, total);
		const range: (number | 'ellipsis')[] = [1];
		if (left > 2) range.push('ellipsis');
		for (let number = Math.max(left, 2); number <= Math.min(right, total - 1); number += 1) {
			range.push(number);
		}
		if (right < total - 1) range.push('ellipsis');
		if (total > 1) range.push(total);
		return range;
	}

	const pages = $derived(buildPageRange(page, totalPages));
</script>

{#if totalPages > 1}
	<nav
		aria-label="pagination"
		class={cn('mx-auto flex w-full flex-wrap items-center justify-center gap-1', className)}
	>
		<a
			href={buildHref(Math.max(1, page - 1))}
			aria-disabled={page <= 1}
			aria-label="Go to previous page"
			class={cn(
				buttonVariants({ variant: 'ghost', size: 'default' }),
				'gap-1 pl-2.5',
				page <= 1 && 'pointer-events-none opacity-50'
			)}
		>
			<ChevronLeft class="size-4" />
			<span class="hidden sm:inline">Previous</span>
		</a>

		{#each pages as entry, index (entry === 'ellipsis' ? `ellipsis-${index}` : entry)}
			{#if entry === 'ellipsis'}
				<span aria-hidden="true" class="flex h-9 w-9 items-center justify-center">
					<Ellipsis class="size-4" />
				</span>
			{:else}
				<a
					href={buildHref(entry)}
					aria-current={entry === page ? 'page' : undefined}
					class={buttonVariants({ variant: entry === page ? 'outline' : 'ghost', size: 'icon' })}
				>
					{entry}
				</a>
			{/if}
		{/each}

		<a
			href={buildHref(Math.min(totalPages, page + 1))}
			aria-disabled={page >= totalPages}
			aria-label="Go to next page"
			class={cn(
				buttonVariants({ variant: 'ghost', size: 'default' }),
				'gap-1 pr-2.5',
				page >= totalPages && 'pointer-events-none opacity-50'
			)}
		>
			<span class="hidden sm:inline">Next</span>
			<ChevronRight class="size-4" />
		</a>
	</nav>
{/if}
