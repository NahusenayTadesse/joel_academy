<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { buttonVariants } from '$lib/components/ui/variants';
	import { cn } from '@nahu/admin-kit/utils.js';

	/*
	 * The original catalog's `DynamicPagination` markup, with real links instead of click handlers so
	 * pages work without JavaScript. Like the original `router.replace(..., { scroll: false })`,
	 * changing page replaces the history entry and keeps the scroll position.
	 */

	let {
		page,
		totalPages,
		href,
		isLoading = false,
		siblingCount = 1,
		class: className = ''
	}: {
		page: number;
		totalPages: number;
		href: (page: number) => string;
		/** Disables every control while a page is loading, so rapid clicks can't queue requests. */
		isLoading?: boolean;
		siblingCount?: number;
		class?: string;
	} = $props();

	function buildPageRange(current: number, total: number, siblings: number) {
		const totalNumbers = siblings * 2 + 5;
		if (total <= totalNumbers) return Array.from({ length: total }, (_, index) => index + 1);

		const left = Math.max(current - siblings, 1);
		const right = Math.min(current + siblings, total);
		const range: (number | 'ellipsis')[] = [1];
		if (left > 2) range.push('ellipsis');
		for (let number = Math.max(left, 2); number <= Math.min(right, total - 1); number += 1) {
			range.push(number);
		}
		if (right < total - 1) range.push('ellipsis');
		if (total > 1) range.push(total);
		return range;
	}

	const pages = $derived(buildPageRange(page, totalPages, siblingCount));
	const disabledClass = 'pointer-events-none opacity-50';
</script>

{#if totalPages > 1}
	<div
		class={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}
		data-sveltekit-noscroll
		data-sveltekit-replacestate
	>
		<div class="flex items-center gap-2">
			<nav
				aria-label="pagination"
				class="mx-0 flex w-fit justify-center"
				aria-busy={isLoading}
			>
				<ul class="flex flex-row flex-wrap items-center justify-center gap-1">
					<li>
						<a
							href={href(Math.max(1, page - 1))}
							aria-label="Go to previous page"
							aria-disabled={page <= 1 || isLoading}
							class={cn(
								buttonVariants({ variant: 'ghost', size: 'default' }),
								'gap-1 pl-2.5',
								(page <= 1 || isLoading) && disabledClass
							)}
						>
							<ChevronLeft class="h-4 w-4" />
							<span class="hidden sm:inline">Previous</span>
						</a>
					</li>
					{#each pages as entry, index (entry === 'ellipsis' ? `ellipsis-${index}` : entry)}
						<li>
							{#if entry === 'ellipsis'}
								<span aria-hidden="true" class="flex h-9 w-9 items-center justify-center">
									<Ellipsis class="h-4 w-4" />
									<span class="sr-only">More pages</span>
								</span>
							{:else}
								<a
									href={href(entry)}
									aria-current={entry === page ? 'page' : undefined}
									aria-disabled={isLoading}
									class={cn(
										buttonVariants({ variant: entry === page ? 'outline' : 'ghost', size: 'icon' }),
										isLoading && disabledClass
									)}
								>
									{entry}
								</a>
							{/if}
						</li>
					{/each}
					<li>
						<a
							href={href(Math.min(totalPages, page + 1))}
							aria-label="Go to next page"
							aria-disabled={page >= totalPages || isLoading}
							class={cn(
								buttonVariants({ variant: 'ghost', size: 'default' }),
								'gap-1 pr-2.5',
								(page >= totalPages || isLoading) && disabledClass
							)}
						>
							<span class="hidden sm:inline">Next</span>
							<ChevronRight class="h-4 w-4" />
						</a>
					</li>
				</ul>
			</nav>
		</div>
	</div>
{/if}
