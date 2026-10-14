<script lang="ts">
	import type { Component } from 'svelte';
	import Play from '@lucide/svelte/icons/play';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	/** Dark hero card at the top of the student home - greeting, context sentence, and a primary CTA. */
	let {
		greeting,
		description,
		ctaLabel,
		ctaHref,
		ctaIcon: Icon = Play,
		class: className = ''
	}: {
		greeting: string;
		description: string;
		ctaLabel: string;
		ctaHref: string;
		ctaIcon?: Component;
		class?: string;
	} = $props();
</script>

<div class={cn('flex min-h-60 flex-col justify-between gap-6 rounded-2xl bg-sidebar p-6 sm:p-8', className)}>
	<div>
		<h1 class="text-2xl font-bold break-words text-sidebar-foreground sm:text-3xl">{greeting}</h1>
		<p class="mt-2 max-w-md text-sidebar-foreground/80">{description}</p>
	</div>
	<Button href={ctaHref} size="lg" class="w-fit gap-2">
		{ctaLabel}
		<Icon class="size-4" />
	</Button>
</div>
