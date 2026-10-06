<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { badgeVariants, type BadgeVariant } from './variants';

	let {
		class: className,
		variant = 'default',
		children,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant } = $props();
</script>

<div class={cn(badgeVariants({ variant }), className)} {...rest}>
	{@render children?.()}
</div>
