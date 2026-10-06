<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let {
		children,
		class: className = '',
		delaySeconds = 0,
		direction = 'up'
	}: { children: Snippet; class?: string; delaySeconds?: number; direction?: 'up' | 'none' } =
		$props();

	let shown = $state(false);

	/** Fades (and optionally slides) the content in once, the first time it scrolls into view. */
	function reveal(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					shown = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '-10% 0px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<div
	use:reveal
	class={cn('transition-[opacity,transform] duration-500 ease-out', className)}
	style:opacity={shown ? 1 : 0}
	style:transform={shown || direction === 'none' ? 'none' : 'translateY(24px)'}
	style:transition-delay="{delaySeconds}s"
>
	{@render children()}
</div>
