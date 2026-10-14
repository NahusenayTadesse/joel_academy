<script lang="ts">
	import type { Component } from 'svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	/*
	 * A compact metric tile - icon, uppercase label, and a big value - for the home's stats row.
	 * Tinted icons use the darker text shades the badges use, so they read on the pale chip.
	 */
	const TONE_CLASSES = {
		primary: 'bg-primary/10 text-primary-ink',
		info: 'bg-info/10 text-[color-mix(in_srgb,var(--info)_65%,black)] dark:text-info',
		warning: 'bg-warning/15 text-[color-mix(in_srgb,var(--warning)_45%,black)] dark:text-warning',
		success: 'bg-success/10 text-success-ink',
		teal: 'bg-tertiary/10 text-tertiary'
	} as const;

	let {
		icon: Icon,
		label,
		value,
		suffix,
		href,
		tone = 'primary',
		class: className = ''
	}: {
		icon: Component;
		label: string;
		value: string | number;
		suffix?: string;
		/** Makes the whole tile a link. */
		href?: string;
		tone?: keyof typeof TONE_CLASSES;
		class?: string;
	} = $props();
</script>

{#snippet body()}
	<span class={cn('flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12', TONE_CLASSES[tone])}>
		<Icon class="size-5" aria-hidden="true" />
	</span>
	<div class="min-w-0">
		<p class="text-[11px] font-bold tracking-wide break-words text-muted-foreground uppercase">{label}</p>
		<p class="text-xl font-bold text-foreground">
			{value}
			{#if suffix}<span class="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>{/if}
		</p>
	</div>
{/snippet}

<Card class={cn('transition-transform duration-200 hover:-translate-y-1', className)}>
	{#if href}
		<a {href} class="flex h-full items-center gap-3 rounded-xl p-3 sm:gap-4 sm:p-4">{@render body()}</a>
	{:else}
		<div class="flex h-full items-center gap-3 p-3 sm:gap-4 sm:p-4">{@render body()}</div>
	{/if}
</Card>
