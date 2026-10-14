<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Circle from '@lucide/svelte/icons/circle';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		title,
		items,
		variant = 'check',
		class: className = ''
	}: {
		title: string;
		items: string[];
		variant?: 'check' | 'dot';
		class?: string;
	} = $props();

	const Icon = $derived(variant === 'check' ? Check : Circle);
</script>

{#if items.length > 0}
	<div class={className || undefined}>
		<h2 class="mb-3 text-lg font-semibold text-foreground">{title}</h2>
		<ul class="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-border p-4 sm:grid-cols-2">
			{#each items as item, index (index)}
				<li class="flex items-start gap-2 text-sm text-foreground">
					<Icon
						class={cn(
							'mt-0.5 size-4 shrink-0',
							variant === 'check'
								? 'text-success-ink'
								: 'fill-muted-foreground/40 text-muted-foreground/40'
						)}
						aria-hidden="true"
					/>
					{item}
				</li>
			{/each}
		</ul>
	</div>
{/if}
