<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		label,
		value,
		icon: Icon,
		class: className = ''
	}: { label: string; value: Snippet; icon?: Component; class?: string } = $props();
</script>

<Card class={cn('flex flex-col gap-3 p-5', className)}>
	<div class="flex items-center justify-between">
		<p class="text-sm font-medium text-muted-foreground">{label}</p>
		{#if Icon}
			<span class="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<Icon class="size-4" aria-hidden="true" />
			</span>
		{/if}
	</div>
	<p class="text-3xl font-semibold tracking-tight text-foreground">{@render value()}</p>
</Card>
