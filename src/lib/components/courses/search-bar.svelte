<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		placeholder = 'Search…',
		value = '',
		onSearch,
		debounceMs = 300,
		class: className = '',
		'aria-label': ariaLabel = 'Search'
	}: {
		placeholder?: string;
		/** The committed query (from the URL); the input follows it when it changes elsewhere. */
		value?: string;
		onSearch: (query: string) => void;
		debounceMs?: number;
		class?: string;
		'aria-label'?: string;
	} = $props();

	let query = $state(untrack(() => value));
	let timer: ReturnType<typeof setTimeout> | undefined;
	/*
	 * The last query handed to `onSearch`. When the URL catches up with it the input is left alone,
	 * so characters typed while that navigation was loading aren't overwritten.
	 */
	let lastSubmitted = untrack(() => value);

	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== lastSubmitted) {
				clearTimeout(timer);
				query = next;
			}
			lastSubmitted = next;
		});
	});

	onDestroy(() => clearTimeout(timer));

	function submit(next: string) {
		clearTimeout(timer);
		lastSubmitted = next;
		onSearch(next);
	}

	function handleInput() {
		clearTimeout(timer);
		timer = setTimeout(() => submit(query), debounceMs);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			submit(query.trim());
		}
	}

	function handleClear() {
		query = '';
		submit('');
	}
</script>

<div class={cn('relative', className)}>
	<Search
		class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
	<Input
		type="search"
		bind:value={query}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{placeholder}
		aria-label={ariaLabel}
		class="pr-9 pl-9"
	/>
	{#if query}
		<Button
			type="button"
			variant="ghost"
			size="icon"
			class="absolute top-1/2 right-1 size-7 -translate-y-1/2"
			onclick={handleClear}
			aria-label="Clear search"
		>
			<X class="size-3.5" />
		</Button>
	{/if}
</div>
