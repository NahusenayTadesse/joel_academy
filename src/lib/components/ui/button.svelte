<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { buttonVariants, type ButtonSize, type ButtonVariant } from './variants';

	type Props = HTMLButtonAttributes &
		HTMLAnchorAttributes & { variant?: ButtonVariant; size?: ButtonSize };

	let {
		class: className,
		variant = 'default',
		size = 'default',
		href = undefined,
		type = 'button',
		disabled,
		children,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		{...rest}
	>
		{@render children?.()}
	</a>
{:else}
	<button class={cn(buttonVariants({ variant, size }), className)} {type} {disabled} {...rest}>
		{@render children?.()}
	</button>
{/if}
