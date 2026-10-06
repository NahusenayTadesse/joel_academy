<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Button from './button.svelte';

	/* The original `LoadingButton`: disabled and busy while its action runs, with a spinner. */
	let {
		loading = false,
		loadingText,
		disabled,
		children,
		...rest
	}: ComponentProps<typeof Button> & { loading?: boolean; loadingText?: string; children?: Snippet } =
		$props();
</script>

<Button disabled={disabled || loading} aria-busy={loading} {...rest}>
	{#if loading}<LoaderCircle class="animate-spin" aria-hidden="true" />{/if}
	{#if loading && loadingText !== undefined}{loadingText}{:else}{@render children?.()}{/if}
</Button>
