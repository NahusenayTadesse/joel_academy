<script lang="ts" module>
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import type { ContactErrors, ContactInput } from './contact-schema';

	/** What the contact page's form action hands back (only seen here after a non-JS post). */
	export interface ContactFormResult {
		values?: Partial<ContactInput>;
		errors?: ContactErrors;
		message?: string;
		sent?: boolean;
	}
</script>

<script lang="ts">
	import Send from '@lucide/svelte/icons/send';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import SpamGuard from '$lib/components/common/spam-guard.svelte';
	import { contactErrors, contactSchema } from './contact-schema';

	let { form, token }: { form?: ContactFormResult | null; token?: string } = $props();

	// Seeded once from a non-JS post-back so typed text survives the round trip.
	// svelte-ignore state_referenced_locally
	const initial = form?.values ?? {};
	let name = $state(initial.name ?? '');
	let email = $state(initial.email ?? '');
	let message = $state(initial.message ?? '');
	// Like the original (react-hook-form defaults): no errors until the first submit, then live.
	// svelte-ignore state_referenced_locally
	let attempted = $state(Boolean(form?.errors && Object.keys(form.errors).length > 0));
	let submitting = $state(false);

	const errors: ContactErrors = $derived.by(() => {
		if (!attempted) return {};
		const parsed = contactSchema.safeParse({ name, email, message });
		return parsed.success ? {} : contactErrors(parsed.error);
	});
</script>

<ActionForm novalidate class="flex flex-col gap-4" submit={({ cancel }) => {
		attempted = true;
		if (!contactSchema.safeParse({ name, email, message }).success) return cancel();
		submitting = true;

		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success') {
				toast.success('Message sent', {
					description: "Thanks for reaching out. We'll reply to your email soon."
				});
				name = email = message = '';
				attempted = false;
			} else if (result.type === 'failure' && typeof result.data?.message === 'string') {
				toast.error('Unable to send message', { description: result.data.message });
			} else if (result.type === 'error') {
				toast.error('Unable to send message', {
					description: 'Something went wrong. Please try again.'
				});
			}
		};
	}}>
	<SpamGuard {token} />
	<div class="flex flex-col gap-1.5">
		<Label for="contact-name">Name</Label>
		<Input id="contact-name" name="name" aria-invalid={Boolean(errors.name)} bind:value={name} />
		{#if errors.name}<p class="text-xs text-destructive">{errors.name}</p>{/if}
	</div>
	<div class="flex flex-col gap-1.5">
		<Label for="contact-email">Email</Label>
		<Input
			id="contact-email"
			name="email"
			type="email"
			aria-invalid={Boolean(errors.email)}
			bind:value={email}
		/>
		{#if errors.email}<p class="text-xs text-destructive">{errors.email}</p>{/if}
	</div>
	<div class="flex flex-col gap-1.5">
		<Label for="contact-message">Message</Label>
		<Textarea
			id="contact-message"
			name="message"
			rows={5}
			aria-invalid={Boolean(errors.message)}
			bind:value={message}
		/>
		{#if errors.message}<p class="text-xs text-destructive">{errors.message}</p>{/if}
	</div>
	<!-- Without JavaScript there is no toast, so the action's message is shown inline instead. -->
	{#if form?.message}<p class="text-xs text-destructive">{form.message}</p>{/if}
	{#if form?.sent}<p class="text-xs text-success-ink">Message sent. We'll reply to your email soon.</p>{/if}
	<Button type="submit" disabled={submitting} class="self-start">
		<Send class="size-4" />
		Send message
	</Button>
</ActionForm>
