<script lang="ts">
	import { Checkbox } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import { page } from '$app/state';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import AuthField from '$lib/components/auth/auth-field.svelte';
	import GoogleLoginButton from '$lib/components/auth/google-login-button.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { safeRedirectPath } from '$lib/safe-redirect';
	import { ROUTES, siteConfig } from '$lib/site';
	import { loginSchema } from './schema';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zod4Client(loginSchema)
	});

	/* Carried over to the register link, so signing up still returns them where they were going. */
	const redirectTarget = $derived(safeRedirectPath(page.url.searchParams.get('redirectTo'), page.url.origin));
	const redirectQuery = $derived(redirectTarget ? `?redirectTo=${encodeURIComponent(redirectTarget)}` : '');
</script>

<svelte:head>
	<title>Sign in · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div>
	<h2 class="text-center text-2xl font-bold text-foreground">Welcome Back</h2>
	<p class="mt-1.5 text-center text-sm text-muted-foreground">Sign in to {siteConfig.name}</p>

	{#if data.googleEnabled}
		<div class="mt-8">
			<GoogleLoginButton redirectTo={redirectTarget} disabled={$submitting} />
			<div class="my-5 flex items-center gap-3 text-xs text-muted-foreground">
				<span class="h-px flex-1 bg-border"></span>
				Or continue with
				<span class="h-px flex-1 bg-border"></span>
			</div>
		</div>
	{/if}
	<form method="post" use:enhance class={data.googleEnabled ? 'space-y-4' : 'mt-8 space-y-4'}>
		<AuthField
			name="email"
			label="Email Address"
			type="email"
			placeholder="student@example.com"
			autocomplete="email"
			icon={Mail}
			bind:value={$form.email}
			errors={$errors.email}
			disabled={$submitting}
		/>
		<AuthField
			name="password"
			label="Password"
			type="password"
			autocomplete="current-password"
			icon={Lock}
			bind:value={$form.password}
			errors={$errors.password}
			disabled={$submitting}
		>
			{#snippet labelExtra()}
				<a href={ROUTES.auth.forgotPassword} class="text-xs font-medium text-brand-ink hover:underline">
					Forgot Password?
				</a>
			{/snippet}
		</AuthField>
		<div class="flex items-center gap-2">
			<Checkbox.Root
				id="rememberMe"
				name="rememberMe"
				disabled={$submitting}
				bind:checked={$form.rememberMe}
				class="peer grid h-4 w-4 shrink-0 place-content-center rounded-[4px] border border-primary shadow focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
			>
				{#snippet children({ checked })}
					{#if checked}<Check class="h-4 w-4" />{/if}
				{/snippet}
			</Checkbox.Root>
			<Label for="rememberMe" class="text-sm font-normal text-muted-foreground">
				Remember me for 30 days
			</Label>
		</div>
		{#if $message?.text}
			<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
				{$message.text}
			</p>
		{:else if data.notice?.type === 'success'}
			<p class="rounded-lg bg-success/10 p-3 text-sm text-success-ink" role="status">{data.notice.text}</p>
		{:else if data.notice}
			<p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
				{data.notice.text}
			</p>
		{/if}
		<LoadingButton type="submit" class="w-full" loading={$submitting} loadingText="Signing in...">
			Sign In
		</LoadingButton>
	</form>

	<div class="mt-6 text-center text-sm">
		<p class="text-muted-foreground">
			Don't have an account?
			<a href="{ROUTES.auth.register}{redirectQuery}" class="font-medium text-brand-ink hover:underline">
				Create an Account
			</a>
		</p>
	</div>
</div>
