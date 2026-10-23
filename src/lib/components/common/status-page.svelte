<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';

	let {
		icon: Icon,
		code,
		title,
		description,
		action
	}: { icon: Component; code?: string; title: string; description: string; action?: Snippet } =
		$props();
</script>

<div
	class="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center"
>
	<span class="flex size-16 items-center justify-center rounded-full bg-muted">
		<Icon class="size-8 text-muted-foreground" aria-hidden="true" />
	</span>
	{#if code}
		<p class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{code}</p>
	{/if}
	<h1 class="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
	<p class="text-sm text-muted-foreground">{description}</p>
	<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
		{@render action?.()}
		<Button variant="outline" href={ROUTES.home}>{m.shell_back_home()}</Button>
	</div>
</div>
