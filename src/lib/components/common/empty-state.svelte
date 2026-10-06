<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Inbox from '@lucide/svelte/icons/inbox';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		icon: Icon = Inbox,
		title,
		description,
		action,
		class: className = ''
	}: { icon?: Component; title: string; description?: string; action?: Snippet; class?: string } =
		$props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center',
		className
	)}
>
	<div class="flex size-12 items-center justify-center rounded-full bg-muted">
		<Icon class="size-6 text-muted-foreground" aria-hidden="true" />
	</div>
	<h3 class="mt-4 text-sm font-semibold text-foreground">{title}</h3>
	{#if description}
		<p class="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if action}<div class="mt-6">{@render action()}</div>{/if}
</div>
