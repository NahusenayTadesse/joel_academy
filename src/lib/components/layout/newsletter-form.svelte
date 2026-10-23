<script lang="ts">
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Send from '@lucide/svelte/icons/send';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { class: className = '' }: { class?: string } = $props();

	/*
	 * A plain shape check (the server validates properly). This form is in every page's footer, so
	 * it does without a validation library that every visitor would otherwise download.
	 */
	const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	let email = $state('');
	/** Bound to the hidden honeypot; only a bot fills it. */
	let website = $state('');
	let error = $state<string>();
	let submitting = $state(false);

	async function subscribe(event: SubmitEvent) {
		event.preventDefault();
		if (!EMAIL.test(email.trim())) {
			error = m.shell_newsletter_invalid_email();
			return;
		}
		error = undefined;
		submitting = true;
		try {
			const response = await fetch('/newsletter', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), website })
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.message);
			if (body.status === 'already_subscribed') toast.info(m.shell_newsletter_already(), { description: body.message });
			else {
				toast.success(m.shell_newsletter_subscribed(), { description: body.message });
				email = '';
			}
		} catch (cause) {
			toast.error(m.shell_newsletter_failed(), {
				description:
					(cause instanceof Error && cause.message) || m.shell_newsletter_failed_retry()
			});
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={subscribe} novalidate class={cn('flex flex-col gap-2 sm:flex-row', className)}>
	<div aria-hidden="true" class="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
		<label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" bind:value={website} /></label>
	</div>
	<div class="flex-1">
		<Input
			type="email"
			placeholder="you@example.com"
			aria-label={m.shell_newsletter_email_label()}
			aria-invalid={Boolean(error)}
			disabled={submitting}
			bind:value={email}
		/>
		{#if error}<p class="mt-1 text-xs text-destructive">{error}</p>{/if}
	</div>
	<Button type="submit" disabled={submitting} class="shrink-0">
		{#if submitting}
			<LoaderCircle class="size-4 animate-spin" />
			{m.shell_newsletter_subscribing()}
		{:else}
			<Send class="size-4" />
			{m.shell_newsletter_subscribe()}
		{/if}
	</Button>
</form>
