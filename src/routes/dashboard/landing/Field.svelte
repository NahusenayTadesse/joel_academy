<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';

	/** A labelled input with its hint and validation error, for the landing editor's nested fields. */
	let {
		id,
		label,
		hint = undefined,
		errors = undefined,
		class: className = '',
		children
	}: {
		id: string;
		label: string;
		hint?: string;
		errors?: string[] | undefined;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class="flex flex-col gap-1.5 {className}">
	<Label for={id}>{label}</Label>
	{@render children()}
	{#if errors?.length}
		<p class="text-xs text-destructive" id="{id}-error">{errors[0]}</p>
	{:else if hint}
		<p class="text-xs text-muted-foreground">{hint}</p>
	{/if}
</div>
