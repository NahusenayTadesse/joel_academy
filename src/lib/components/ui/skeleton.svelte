<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { class: className, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('animate-pulse rounded-md bg-primary/10', className)} {...rest}></div>
