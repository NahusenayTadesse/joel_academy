<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { inputClass } from './variants';

	let {
		class: className,
		value = $bindable(),
		ref = $bindable(null),
		...rest
	}: HTMLInputAttributes & { ref?: HTMLInputElement | null } = $props();
</script>

<input bind:this={ref} bind:value class={cn(inputClass, className)} {...rest} />
