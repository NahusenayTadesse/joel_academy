<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { cn } from '@nahu/admin-kit/utils.js';

	/* The original `ErrorState`, with an action slot in place of its retry callback. */
	let {
		icon: Icon = TriangleAlert,
		title = 'Something went wrong',
		description = 'An unexpected error occurred. Please try again.',
		action,
		class: className = ''
	}: { icon?: Component; title?: string; description?: string; action?: Snippet; class?: string } =
		$props();
</script>

<div
	role="alert"
	class={cn(
		'flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center',
		className
	)}
>
	<div class="flex size-12 items-center justify-center rounded-full bg-destructive/10">
		<Icon class="size-6 text-destructive" aria-hidden="true" />
	</div>
	<h3 class="mt-4 text-sm font-semibold text-foreground">{title}</h3>
	<p class="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
	{#if action}<div class="mt-6">{@render action()}</div>{/if}
</div>
