<script lang="ts">
	import type { Component } from 'svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		icon: Icon,
		title,
		description,
		class: className = ''
	}: { icon: Component; title: string; description: string; class?: string } = $props();
</script>

<Card class={cn('flex flex-col gap-3 p-6', className)}>
	<span class="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
		<Icon class="size-5" aria-hidden="true" />
	</span>
	<h3 class="text-base font-semibold text-foreground">{title}</h3>
	<p class="text-sm text-muted-foreground">{description}</p>
</Card>
