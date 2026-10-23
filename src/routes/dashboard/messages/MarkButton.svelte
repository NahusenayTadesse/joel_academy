<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Mail from '@lucide/svelte/icons/mail';
	import MailOpen from '@lucide/svelte/icons/mail-open';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	/** Toggles a message between read and unread. */
	let { id, status }: { id: number; status: 'NEW' | 'READ' } = $props();
	let busy = $state(false);
</script>

<ActionForm action="?/mark" submit={() => {
		busy = true;
		return async ({ update }) => {
			await update();
			busy = false;
		};
	}}>
	<HiddenField name="id" value={id} />
	<HiddenField name="status" value={status === 'NEW' ? 'READ' : 'NEW'} />
	<Button type="submit" variant="ghost" size="sm" disabled={busy}>
		{#if status === 'NEW'}
			<MailOpen class="size-4" /> Mark read
		{:else}
			<Mail class="size-4" /> Mark unread
		{/if}
	</Button>
</ActionForm>
