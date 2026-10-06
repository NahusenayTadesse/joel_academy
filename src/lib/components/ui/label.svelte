<script lang="ts">
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { labelClass } from './variants';

	let { class: className, children, ...rest }: HTMLLabelAttributes = $props();
</script>

<label class={cn(labelClass, className)} {...rest}>{@render children?.()}</label>
