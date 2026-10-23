<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { m } from '$lib/paraglide/messages';

	/* Asks an unverified student to confirm their address, with a way to get the link again. */
	let {
		email,
		resent = false,
		error
	}: { email: string; resent?: boolean; error?: string } = $props();

	let sending = $state(false);
</script>

<div
	class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
	role="status"
>
	<div class="flex items-start gap-3">
		<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
			<MailCheck class="size-4" aria-hidden="true" />
		</span>
		<div class="text-sm">
			<p class="font-medium text-foreground">{m.account_confirm_email_title()}</p>
			<p class="text-muted-foreground">
				{#if resent}
					{m.account_verify_notice_resent_before()} <span class="font-medium text-foreground">{email}</span>{m.account_verify_notice_resent_after()}
				{:else}
					{m.account_verify_notice_before()} <span class="font-medium text-foreground">{email}</span>{m.account_verify_notice_after()}
				{/if}
			</p>
			{#if error}<p class="mt-1 text-destructive">{error}</p>{/if}
		</div>
	</div>
	<ActionForm action="?/resendVerification" class="shrink-0" submit={() => {
			sending = true;
			return async ({ update }) => {
				await update({ reset: false });
				sending = false;
			};
		}}>
		<LoadingButton type="submit" variant="outline" size="sm" loading={sending} loadingText={m.account_sending()}>
			{m.account_resend_email()}
		</LoadingButton>
	</ActionForm>
</div>
