<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import { cn } from '@nahu/admin-kit/utils.js';

	/** Five stars for a rating, read out as "4.5 out of 5 stars". Whole stars, rounded. */
	let {
		value,
		class: className = '',
		starClass = 'size-4'
	}: { value: number; class?: string; starClass?: string } = $props();

	const filled = $derived(Math.round(value));
	const label = $derived(`${Number.isInteger(value) ? value : value.toFixed(1)} out of 5 stars`);
</script>

<span class={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={label}>
	{#each { length: 5 }, index (index)}
		<Star
			aria-hidden="true"
			class={cn(starClass, index < filled ? 'fill-warning text-warning' : 'text-muted-foreground/40')}
		/>
	{/each}
</span>
