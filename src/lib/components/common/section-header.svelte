<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		title,
		description,
		actions,
		class: className = ''
	}: { title: string; description?: string; actions?: Snippet; class?: string } = $props();
</script>

<div class={cn('flex items-center justify-between gap-4', className)}>
	<div class="space-y-0.5">
		<h2 class="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
		{#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
	</div>
	{#if actions}<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>{/if}
</div>
