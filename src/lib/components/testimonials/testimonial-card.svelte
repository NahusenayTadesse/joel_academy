<script lang="ts">
	import Quote from '@lucide/svelte/icons/quote';
	import Star from '@lucide/svelte/icons/star';
	import Card from '$lib/components/ui/card.svelte';
	import type { Testimonial } from '$lib/content/testimonial.types';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { testimonial, class: className = '' }: { testimonial: Testimonial; class?: string } =
		$props();

	const initials = $derived(
		testimonial.studentName
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
	);
</script>

<Card class={cn('flex h-full flex-col gap-4 p-6', className)}>
	<Quote class="size-6 text-brand/40" aria-hidden="true" />
	<p class="flex-1 text-sm leading-relaxed text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
	<div class="flex items-center gap-1" role="img" aria-label="{testimonial.rating} out of 5 stars">
		{#each { length: 5 }, index (index)}
			<Star
				class={cn(
					'size-3.5',
					index < testimonial.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'
				)}
			/>
		{/each}
	</div>
	<div class="flex items-center gap-3 border-t border-border pt-4">
		{#if testimonial.avatarUrl}
			<img
				src={testimonial.avatarUrl}
				alt={testimonial.studentName}
				loading="lazy"
				class="size-10 shrink-0 rounded-full border border-border object-cover"
			/>
		{:else}
			<span
				class={cn(
					'flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-semibold text-white',
					testimonial.avatarColor
				)}
			>
				{initials}
			</span>
		{/if}
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold text-foreground">{testimonial.studentName}</p>
			<p class="truncate text-xs text-muted-foreground">{testimonial.role}</p>
		</div>
	</div>
</Card>
