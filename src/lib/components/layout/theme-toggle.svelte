<script lang="ts">
	import { onMount } from 'svelte';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, setMode } from 'mode-watcher';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';

	// The server cannot know the stored theme, so render the neutral icon until mounted.
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const isDark = $derived(mounted && mode.current === 'dark');
	const label = $derived(isDark ? m.shell_theme_to_light() : m.shell_theme_to_dark());
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={() => setMode(isDark ? 'light' : 'dark')}
	aria-label={label}
	title={label}
	class="relative size-9 rounded-lg text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
>
	{#if mounted}
		{#if isDark}
			<Sun class="size-4 text-amber-400 transition-all duration-200 hover:rotate-45" />
		{:else}
			<Moon
				class="size-4 text-slate-700 transition-all duration-200 hover:-rotate-12 dark:text-slate-200"
			/>
		{/if}
	{:else}
		<Sun class="size-4 text-muted-foreground opacity-60" />
	{/if}
</Button>
