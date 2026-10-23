<script lang="ts">
	import type { CourseAccessType } from '$lib/content/catalog.types';
	import { formatCurrency } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		accessType,
		price,
		discountPrice,
		currency,
		class: className = ''
	}: {
		accessType: CourseAccessType;
		price: string;
		discountPrice: string | null;
		currency: string;
		class?: string;
	} = $props();

	const hasDiscount = $derived(discountPrice !== null && Number(discountPrice) < Number(price));
</script>

{#if accessType === 'FREE'}
	<span class={cn('text-sm font-semibold text-success-ink', className)}>{m.catalog_price_free()}</span>
{:else}
	<span class={cn('flex items-baseline gap-2', className)}>
		<span class="text-sm font-semibold text-foreground">
			{formatCurrency(hasDiscount ? discountPrice! : price, currency)}
		</span>
		{#if hasDiscount}
			<span class="text-xs text-muted-foreground line-through">{formatCurrency(price, currency)}</span>
		{/if}
	</span>
{/if}
