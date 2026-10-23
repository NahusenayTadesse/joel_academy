<script lang="ts">
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import AuthField from '$lib/components/auth/auth-field.svelte';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
	import { verifySchema } from './schema';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zod4Client(verifySchema)
	});
</script>

<svelte:head>
	<title>{m.account_verify_title()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div>
	<h2 class="text-center text-2xl font-bold text-foreground">{m.account_verify_title()}</h2>
	<p class="mt-1.5 text-center text-sm text-muted-foreground">{m.account_verify_subheading()}</p>

	<form method="post" use:enhance class="mt-8 space-y-4">
		<AuthField
			name="token"
			label={m.account_secure_token()}
			autocomplete="off"
			icon={KeyRound}
			bind:value={$form.token}
			errors={$errors.token}
			disabled={$submitting}
		/>
		{#if $message?.text}
			<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
				{$message.text}
			</p>
		{/if}
		<LoadingButton type="submit" class="w-full" loading={$submitting} loadingText={m.account_verifying()}>
			{m.account_verify_title()}
		</LoadingButton>
	</form>

	<div class="mt-6 text-center text-sm">
		<a href={ROUTES.auth.login} class="font-medium text-brand-ink hover:underline">{m.account_back_to_sign_in()}</a>
	</div>
</div>
