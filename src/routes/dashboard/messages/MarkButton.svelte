<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import MailOpen from '@lucide/svelte/icons/mail-open';
	import { enhance } from '$app/forms';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	/** Toggles a message between read and unread. */
	let { id, status }: { id: number; status: 'NEW' | 'READ' } = $props();
	let busy = $state(false);
</script>

<form
	method="post"
	action="?/mark"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update();
			busy = false;
		};
	}}
>
	<input type="hidden" name="id" value={id} />
	<input type="hidden" name="status" value={status === 'NEW' ? 'READ' : 'NEW'} />
	<Button type="submit" variant="ghost" size="sm" disabled={busy}>
		{#if status === 'NEW'}
			<MailOpen class="size-4" /> Mark read
		{:else}
			<Mail class="size-4" /> Mark unread
		{/if}
	</Button>
</form>
