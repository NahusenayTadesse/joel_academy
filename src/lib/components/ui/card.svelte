<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('rounded-2xl border bg-card text-card-foreground shadow-card', className)} {...rest}>
	{@render children?.()}
</div>
