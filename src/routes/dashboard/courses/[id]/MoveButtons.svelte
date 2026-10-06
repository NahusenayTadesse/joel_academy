<script lang="ts">
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import { enhance } from '$app/forms';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	/** Up and down arrows that post `{ id, direction }` to a reorder action. */
	let {
		action,
		id,
		first = false,
		last = false,
		label = 'item'
	}: { action: string; id: number; first?: boolean; last?: boolean; label?: string } = $props();

	let busy = $state(false);

	const submit = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<form method="post" {action} use:enhance={submit} class="inline-flex items-center">
	<input type="hidden" name="id" value={id} />
	<Button
		type="submit"
		name="direction"
		value="up"
		variant="ghost"
		size="icon"
		class="size-8"
		disabled={first || busy}
		aria-label="Move {label} up"
		title="Move up"
	>
		<ArrowUp class="size-4" />
	</Button>
	<Button
		type="submit"
		name="direction"
		value="down"
		variant="ghost"
		size="icon"
		class="size-8"
		disabled={last || busy}
		aria-label="Move {label} down"
		title="Move down"
	>
		<ArrowDown class="size-4" />
	</Button>
</form>
