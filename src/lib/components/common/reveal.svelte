<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '@nahu/admin-kit/utils.js';
	import { inView } from '$lib/attachments';

	let {
		children,
		class: className = '',
		delaySeconds = 0,
		direction = 'up'
	}: { children: Snippet; class?: string; delaySeconds?: number; direction?: 'up' | 'none' } =
		$props();
</script>

<!--
	Fades (and optionally rises) the content in once, the first time it scrolls into view. The
	`reveal` class hides it only when scripts run, so the server-rendered page is never blank.
-->
<div
	class={cn('reveal', className)}
	style:--delay="{delaySeconds}s"
	style:--reveal-y={direction === 'none' ? '0px' : undefined}
	{@attach inView()}
>
	{@render children()}
</div>
