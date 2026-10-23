<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { m } from '$lib/paraglide/messages';
	import { RATING_WORDS } from './rules';

	/*
	 * A star rating input built on five native radios, so arrow keys, required-field checks and
	 * the posted `rating` value all come from the browser. Hovering previews a value.
	 */
	let {
		value = $bindable(),
		name = 'rating',
		legend = m.catalog_review_your_rating(),
		required = true
	}: { value?: number; name?: string; legend?: string; required?: boolean } = $props();

	let hovered = $state<number>();
	const shown = $derived(hovered ?? value ?? 0);
	const values = [1, 2, 3, 4, 5];
</script>

<fieldset class="flex flex-col gap-1.5">
	<legend class="mb-1.5 text-sm font-medium text-foreground">{legend}</legend>
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
		<div class="flex items-center" role="presentation" onmouseleave={() => (hovered = undefined)}>
			{#each values as n (n)}
				<label
					class="cursor-pointer rounded-md p-1 has-focus-visible:ring-2 has-focus-visible:ring-ring"
					onmouseenter={() => (hovered = n)}
				>
					<input
						type="radio"
						class="sr-only"
						{name}
						value={n}
						bind:group={value}
						required={required && n === 1}
					/>
					<Star
						aria-hidden="true"
						class={cn(
							'size-7 transition-colors',
							n <= shown ? 'fill-warning text-warning' : 'text-muted-foreground'
						)}
					/>
					<span class="sr-only">{m.catalog_review_star_option({ stars: n, word: RATING_WORDS[n] })}</span>
				</label>
			{/each}
		</div>
		<span class="text-sm text-muted-foreground" aria-hidden="true">
			{shown ? RATING_WORDS[shown] : m.catalog_review_select_rating()}
		</span>
	</div>
</fieldset>
