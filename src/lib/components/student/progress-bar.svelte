<script lang="ts">
	import { cn } from '@nahu/admin-kit/utils.js';

	/* The original shadcn `Progress`. */
	let { value, class: className = '' }: { value: number; class?: string } = $props();
</script>

<div
	role="progressbar"
	aria-valuemin={0}
	aria-valuemax={100}
	aria-valuenow={value}
	class={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
>
	<div class="h-full w-full flex-1 bg-primary transition-all" style:transform="translateX(-{100 - value}%)"></div>
</div>
