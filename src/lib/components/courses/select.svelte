<script lang="ts" module>
	export interface SelectOption {
		value: string;
		label: string;
	}
</script>

<script lang="ts">
	import { Select } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { cn } from '@nahu/admin-kit/utils.js';

	/*
	 * Single-value select with the original shadcn/Radix select's classes. Radix's CSS variables and
	 * `focus:` item highlight map to bits-ui's `--bits-select-*` variables and `data-highlighted`.
	 */

	let {
		value,
		items,
		placeholder = '',
		onValueChange,
		class: className = ''
	}: {
		value: string;
		items: SelectOption[];
		placeholder?: string;
		onValueChange: (value: string) => void;
		/** Applied to the trigger, e.g. its width. */
		class?: string;
	} = $props();

	const selectedLabel = $derived(items.find((item) => item.value === value)?.label);
</script>

<Select.Root type="single" {value} {onValueChange} {items}>
	<Select.Trigger
		class={cn(
			'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm ring-offset-background focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1',
			className
		)}
	>
		<span>{selectedLabel ?? placeholder}</span>
		<ChevronDown class="h-4 w-4 opacity-50" />
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			class="relative z-50 max-h-(--bits-select-content-available-height) min-w-[8rem] origin-(--bits-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:translate-y-1 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:-translate-x-1 data-[side=left]:slide-in-from-right-2 data-[side=right]:translate-x-1 data-[side=right]:slide-in-from-left-2 data-[side=top]:-translate-y-1 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
		>
			<Select.ScrollUpButton class="flex cursor-default items-center justify-center py-1">
				<ChevronUp class="h-4 w-4" />
			</Select.ScrollUpButton>
			<Select.Viewport
				class="h-(--bits-select-anchor-height) w-full min-w-(--bits-select-anchor-width) p-1"
			>
				{#each items as item (item.value)}
					<Select.Item
						value={item.value}
						label={item.label}
						class="relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
					>
						{#snippet children({ selected })}
							<span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
								{#if selected}<Check class="h-4 w-4" />{/if}
							</span>
							{item.label}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
			<Select.ScrollDownButton class="flex cursor-default items-center justify-center py-1">
				<ChevronDown class="h-4 w-4" />
			</Select.ScrollDownButton>
		</Select.Content>
	</Select.Portal>
</Select.Root>
