<script lang="ts">
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Send from '@lucide/svelte/icons/send';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { class: className = '' }: { class?: string } = $props();

	const schema = z.string().trim().min(1, 'Please enter a valid email address.').email('Please enter a valid email address.');

	let email = $state('');
	let error = $state<string>();
	let submitting = $state(false);

	async function subscribe(event: SubmitEvent) {
		event.preventDefault();
		const parsed = schema.safeParse(email);
		if (!parsed.success) {
			error = parsed.error.issues[0]?.message;
			return;
		}
		error = undefined;
		submitting = true;
		try {
			const response = await fetch('/newsletter', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: parsed.data })
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.message);
			if (body.status === 'already_subscribed') toast.info('Already subscribed', { description: body.message });
			else {
				toast.success("You're subscribed!", { description: body.message });
				email = '';
			}
		} catch (cause) {
			toast.error('Unable to subscribe', {
				description:
					(cause instanceof Error && cause.message) || 'Unable to subscribe right now. Please try again.'
			});
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={subscribe} novalidate class={cn('flex flex-col gap-2 sm:flex-row', className)}>
	<div class="flex-1">
		<Input
			type="email"
			placeholder="you@example.com"
			aria-label="Email address"
			aria-invalid={Boolean(error)}
			disabled={submitting}
			bind:value={email}
		/>
		{#if error}<p class="mt-1 text-xs text-destructive">{error}</p>{/if}
	</div>
	<Button type="submit" disabled={submitting} class="shrink-0">
		{#if submitting}
			<LoaderCircle class="size-4 animate-spin" />
			Subscribing...
		{:else}
			<Send class="size-4" />
			Subscribe
		{/if}
	</Button>
</form>
