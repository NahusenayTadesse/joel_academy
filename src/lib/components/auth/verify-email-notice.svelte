<script lang="ts">
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import { enhance } from '$app/forms';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';

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
		<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
			<MailCheck class="size-4" aria-hidden="true" />
		</span>
		<div class="text-sm">
			<p class="font-medium text-foreground">Confirm your email</p>
			<p class="text-muted-foreground">
				{#if resent}
					We sent a new link to <span class="font-medium text-foreground">{email}</span>. Check your inbox and spam folder.
				{:else}
					We sent a confirmation link to <span class="font-medium text-foreground">{email}</span>, so we can reach you
					about your courses and certificates.
				{/if}
			</p>
			{#if error}<p class="mt-1 text-destructive">{error}</p>{/if}
		</div>
	</div>
	<form
		method="post"
		action="?/resendVerification"
		class="shrink-0"
		use:enhance={() => {
			sending = true;
			return async ({ update }) => {
				await update({ reset: false });
				sending = false;
			};
		}}
	>
		<LoadingButton type="submit" variant="outline" size="sm" loading={sending} loadingText="Sending...">
			Resend email
		</LoadingButton>
	</form>
</div>
