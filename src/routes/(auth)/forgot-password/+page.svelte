<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import AuthField from '$lib/components/auth/auth-field.svelte';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
	import { forgotSchema } from './schema';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zod4Client(forgotSchema)
	});
</script>

<svelte:head>
	<title>{m.account_forgot_page_title()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div>
	<h2 class="text-center text-2xl font-bold text-foreground">{m.account_forgot_heading()}</h2>
	<p class="mt-1.5 text-center text-sm text-muted-foreground">{m.account_forgot_subheading()}</p>

	<form method="post" use:enhance class="mt-8 space-y-4">
		<AuthField
			name="email"
			label={m.account_email_label()}
			type="email"
			placeholder="student@example.com"
			autocomplete="email"
			icon={Mail}
			bind:value={$form.email}
			errors={$errors.email}
			disabled={$submitting}
		/>
		{#if $message?.type === 'success'}
			<p class="rounded-lg bg-success/10 p-3 text-sm text-success-ink" role="status">{$message.text}</p>
		{:else if $message?.text}
			<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
				{$message.text}
			</p>
		{/if}
		<LoadingButton type="submit" class="w-full" loading={$submitting} loadingText={m.account_sending()}>
			{m.account_send_reset_link()}
		</LoadingButton>
	</form>

	<div class="mt-6 text-center text-sm">
		<a href={ROUTES.auth.login} class="font-medium text-brand-ink hover:underline">{m.account_back_to_sign_in()}</a>
	</div>
</div>
