<script lang="ts">
	import { Popover } from 'bits-ui';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Layers from '@lucide/svelte/icons/layers';
	import type { Category } from '$lib/content/catalog.types';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';

	let { categories }: { categories: Pick<Category, 'id' | 'name' | 'slug'>[] } = $props();
	let open = $state(false);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
	>
		{m.shell_nav_courses()}
		<ChevronDown class="size-3.5" aria-hidden="true" />
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			align="start"
			sideOffset={4}
			class="z-50 w-[420px] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[side=bottom]:slide-in-from-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
		>
			<p class="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				{m.shell_menu_popular_categories()}
			</p>
			<div class="grid grid-cols-2 gap-1">
				{#each categories as category (category.id)}
					<a
						href={ROUTES.categories.detail(category.slug)}
						onclick={() => (open = false)}
						class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-accent hover:text-foreground"
					>
						<Layers class="size-3.5 shrink-0 text-muted-foreground" />
						<span class="truncate">{category.name}</span>
					</a>
				{/each}
			</div>
			<div class="mt-3 flex flex-col gap-1 border-t border-border pt-3">
				<a
					href={ROUTES.courses.list}
					onclick={() => (open = false)}
					class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-brand-ink hover:bg-accent"
				>
					{m.shell_menu_browse_all_courses()}
					<ArrowRight class="size-3.5" />
				</a>
				<a
					href={ROUTES.categories.list}
					onclick={() => (open = false)}
					class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-accent hover:text-foreground"
				>
					{m.shell_menu_view_all_categories()}
					<ArrowRight class="size-3.5" />
				</a>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
