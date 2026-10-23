<script lang="ts">
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import User from '@lucide/svelte/icons/user';
	import { page } from '$app/state';
	import SpamGuard from '$lib/components/common/spam-guard.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import AuthField from '$lib/components/auth/auth-field.svelte';
	import GoogleLoginButton from '$lib/components/auth/google-login-button.svelte';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { safeRedirectPath } from '$lib/safe-redirect';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';
	import { registerSchema } from './schema';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zod4Client(registerSchema)
	});

	const redirectTarget = $derived(safeRedirectPath(page.url.searchParams.get('redirectTo'), page.url.origin));
	const redirectQuery = $derived(redirectTarget ? `?redirectTo=${encodeURIComponent(redirectTarget)}` : '');
</script>

<svelte:head>
	<title>{m.account_register_title()} · {siteConfig.name}</title>
	<meta name="description" content={m.misc_register_meta()} />
</svelte:head>

<div>
	<h2 class="text-center text-2xl font-bold text-foreground">{m.account_register_title()}</h2>
	<p class="mt-1.5 text-center text-sm text-muted-foreground">{m.account_register_subheading({ site: siteConfig.name })}</p>

	{#if data.googleEnabled}
		<div class="mt-8">
			<GoogleLoginButton redirectTo={redirectTarget} disabled={$submitting} />
			<div class="my-5 flex items-center gap-3 text-xs text-muted-foreground">
				<span class="h-px flex-1 bg-border"></span>
				{m.account_or_continue_with()}
				<span class="h-px flex-1 bg-border"></span>
			</div>
		</div>
	{/if}
	<form method="post" use:enhance class={data.googleEnabled ? 'space-y-4' : 'mt-8 space-y-4'}>
		<SpamGuard token={data.formToken} />
		<div class="grid grid-cols-2 gap-3">
			<AuthField
				name="firstName"
				label={m.account_first_name()}
				autocomplete="given-name"
				icon={User}
				bind:value={$form.firstName}
				errors={$errors.firstName}
				disabled={$submitting}
			/>
			<AuthField
				name="lastName"
				label={m.account_last_name()}
				autocomplete="family-name"
				icon={User}
				bind:value={$form.lastName}
				errors={$errors.lastName}
				disabled={$submitting}
			/>
		</div>
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
		<AuthField
			name="phone"
			label={m.account_phone_label_sms()}
			type="tel"
			placeholder="0912 345 678"
			autocomplete="tel"
			inputmode="tel"
			icon={Phone}
			bind:value={$form.phone}
			errors={$errors.phone}
			disabled={$submitting}
			hint={m.account_phone_hint_register()}
		/>
		<AuthField
			name="password"
			label={m.account_password_label()}
			type="password"
			autocomplete="new-password"
			icon={Lock}
			bind:value={$form.password}
			errors={$errors.password}
			disabled={$submitting}
		/>
		<AuthField
			name="confirmPassword"
			label={m.account_confirm_password()}
			type="password"
			autocomplete="new-password"
			icon={Lock}
			bind:value={$form.confirmPassword}
			errors={$errors.confirmPassword}
			disabled={$submitting}
		/>
		{#if $message?.text}
			<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
				{$message.text}
			</p>
		{/if}
		<LoadingButton
			type="submit"
			class="w-full"
			loading={$submitting}
			loadingText={m.account_creating_account()}
		>
			{m.account_register_title()}
		</LoadingButton>
	</form>

	<div class="mt-6 text-center text-sm">
		<a href="{ROUTES.auth.login}{redirectQuery}" class="font-medium text-brand-ink hover:underline">
			{m.account_back_to_sign_in()}
		</a>
	</div>
</div>
