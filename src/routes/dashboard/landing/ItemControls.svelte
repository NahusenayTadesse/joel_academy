<script lang="ts">
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Trash from '@lucide/svelte/icons/trash';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	/** Move up / move down / remove for one entry of a repeatable list. */
	let {
		index,
		count,
		label,
		onmove,
		onremove
	}: {
		index: number;
		count: number;
		/** What the entry is, for screen readers: "pill 2". */
		label: string;
		onmove: (from: number, to: number) => void;
		onremove: (index: number) => void;
	} = $props();
</script>

<div class="flex shrink-0 items-center gap-1">
	<Button
		type="button"
		variant="ghost"
		size="icon"
		aria-label="Move {label} up"
		disabled={index === 0}
		onclick={() => onmove(index, index - 1)}
	>
		<ArrowUp class="size-4" />
	</Button>
	<Button
		type="button"
		variant="ghost"
		size="icon"
		aria-label="Move {label} down"
		disabled={index === count - 1}
		onclick={() => onmove(index, index + 1)}
	>
		<ArrowDown class="size-4" />
	</Button>
	<Button
		type="button"
		variant="ghost"
		size="icon"
		class="text-destructive"
		aria-label="Remove {label}"
		onclick={() => onremove(index)}
	>
		<Trash class="size-4" />
	</Button>
</div>
