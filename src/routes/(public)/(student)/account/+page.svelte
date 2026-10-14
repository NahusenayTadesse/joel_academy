<script lang="ts">
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import Phone from '@lucide/svelte/icons/phone';
	import User from '@lucide/svelte/icons/user';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import AuthField from '$lib/components/auth/auth-field.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { localPhone } from '$lib/phone';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data, form } = $props();

	const account = $derived(data.account);

	/** Which form is waiting on the server, for its button's spinner. */
	let busy = $state<string | null>(null);
	/** Showing the new-number form while a verified number is already on the account. */
	let changing = $state(false);
	let confirmingRemove = $state(false);

	function submit(name: string, reset = true): SubmitFunction {
		return () => {
			busy = name;
			return async ({ result, update }) => {
				await update({ reset });
				busy = null;
				if (result.type === 'success') {
					changing = false;
					confirmingRemove = false;
				}
			};
		};
	}

	const sectionClass = 'rounded-xl border border-border bg-card p-5 shadow-card sm:p-6';
	const successClass = 'flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success-ink';
	const errorClass = 'rounded-lg bg-destructive/10 p-3 text-sm text-destructive';

	const passwordError = $derived(form?.password && 'error' in form.password ? form.password : null);
	const fieldError = (name: string) =>
		passwordError && passwordError.field === name ? [passwordError.error] : undefined;
</script>

<svelte:head>
	<title>Account · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
	<PageHeader title="Account" description="Your details, phone number for SMS updates, and password." />

	<!-- Profile -->
	<section class={sectionClass} aria-labelledby="profile-heading">
		<div class="mb-5 flex items-center gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<User class="size-4" aria-hidden="true" />
			</span>
			<h2 id="profile-heading" class="text-lg font-bold text-foreground">Profile</h2>
		</div>
		<form method="post" action="?/profile" class="space-y-4" use:enhance={submit('profile', false)}>
			<AuthField
				name="name"
				label="Full name"
				autocomplete="name"
				icon={User}
				value={account.name}
				errors={form?.profile && 'error' in form.profile ? [form.profile.error] : undefined}
				disabled={busy === 'profile'}
			/>
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label for="email">Email Address</Label>
					{#if account.emailVerified}
						<Badge variant="success">Verified</Badge>
					{:else}
						<Badge variant="warning">Not confirmed</Badge>
					{/if}
				</div>
				<div class="relative">
					<Mail
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input id="email" type="email" value={account.email} readonly class="pl-9 text-muted-foreground" />
				</div>
				<p class="text-xs text-muted-foreground">Your email is how you sign in, so it can't be changed here.</p>
			</div>
			{#if form?.profile && 'saved' in form.profile}
				<p class={successClass} role="status"><CircleCheck class="size-4" aria-hidden="true" /> Profile saved.</p>
			{/if}
			<LoadingButton type="submit" loading={busy === 'profile'} loadingText="Saving...">Save profile</LoadingButton>
		</form>
	</section>

	<!-- Phone -->
	<section class={sectionClass} aria-labelledby="phone-heading">
		<div class="mb-5 flex items-start gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<MessageSquareText class="size-4" aria-hidden="true" />
			</span>
			<div>
				<h2 id="phone-heading" class="text-lg font-bold text-foreground">Phone number</h2>
				<p class="text-sm text-muted-foreground">
					We text a verified number when you're enrolled, a payment is reviewed, or a certificate is ready.
				</p>
			</div>
		</div>

		<div class="space-y-4">
			{#if form?.verifyCode && 'verified' in form.verifyCode}
				<div class="flex flex-col gap-3 rounded-lg bg-success/10 p-3 sm:flex-row sm:items-center sm:justify-between" role="status">
					<p class="flex items-center gap-2 text-sm text-success-ink">
						<CircleCheck class="size-4 shrink-0" aria-hidden="true" />
						Phone number verified. You'll get SMS updates at {localPhone(form.verifyCode.verified)}.
					</p>
					<Button size="sm" variant="outline" href={data.continueTo ?? ROUTES.student.courses} class="shrink-0">
						{data.continueTo ? 'Continue' : 'Go to My Courses'}
					</Button>
				</div>
			{:else if form?.removePhone}
				<p class={successClass} role="status">
					<CircleCheck class="size-4" aria-hidden="true" /> Phone number removed. We won't text you anymore.
				</p>
			{/if}

			{#if data.pendingPhone}
				<!-- Step two: the code. -->
				<div class="rounded-lg border border-brand/30 bg-brand/5 p-4">
					<p class="text-sm text-foreground">
						Enter the 6-digit code we sent to
						<span class="font-semibold">{localPhone(data.pendingPhone)}</span>. It's valid for 5 minutes.
					</p>
					<form
						method="post"
						action="?/verifyCode"
						class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
						use:enhance={submit('verifyCode')}
					>
						<div class="sm:w-48">
							<AuthField
								name="code"
								label="Verification code"
								placeholder="123456"
								autocomplete="one-time-code"
								inputmode="numeric"
								maxlength={6}
								icon={KeyRound}
								errors={form?.verifyCode && 'error' in form.verifyCode ? [form.verifyCode.error] : undefined}
								disabled={busy === 'verifyCode'}
							/>
						</div>
						<LoadingButton type="submit" class="sm:mt-6" loading={busy === 'verifyCode'} loadingText="Checking...">
							Verify number
						</LoadingButton>
					</form>
					<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						<form method="post" action="?/sendCode" use:enhance={submit('resend')}>
							<input type="hidden" name="phone" value={data.pendingPhone} />
							<button
								type="submit"
								class="font-medium text-brand-ink hover:underline disabled:opacity-50"
								disabled={busy === 'resend'}
							>
								{busy === 'resend' ? 'Sending...' : 'Send a new code'}
							</button>
						</form>
						<form method="post" action="?/cancelCode" use:enhance={submit('cancel')}>
							<button type="submit" class="text-muted-foreground hover:text-foreground hover:underline">
								Use a different number
							</button>
						</form>
					</div>
					{#if form?.sendCode && 'error' in form.sendCode}
						<p class="mt-3 {errorClass}" role="alert">{form.sendCode.error}</p>
					{:else if form?.sendCode && 'sent' in form.sendCode}
						<p class="mt-3 text-sm text-muted-foreground" role="status">A new code is on its way.</p>
					{/if}
				</div>
			{:else if account.phone && !changing}
				<!-- A verified number. -->
				<div class="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-3">
						<Phone class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="font-medium text-foreground">{localPhone(account.phone)}</span>
						<Badge variant="success" class="gap-1"><BadgeCheck class="size-3" aria-hidden="true" /> Verified</Badge>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button size="sm" variant="outline" onclick={() => ((changing = true), (confirmingRemove = false))}>
							Change number
						</Button>
						{#if !confirmingRemove}
							<Button size="sm" variant="ghost" class="text-destructive" onclick={() => (confirmingRemove = true)}>
								Remove
							</Button>
						{/if}
					</div>
				</div>
				{#if confirmingRemove}
					<form
						method="post"
						action="?/removePhone"
						class="flex flex-col gap-3 rounded-lg bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
						use:enhance={submit('remove')}
					>
						<p class="text-sm text-foreground">Remove this number? You'll stop getting SMS updates.</p>
						<div class="flex shrink-0 gap-2">
							<Button size="sm" variant="ghost" onclick={() => (confirmingRemove = false)}>Keep it</Button>
							<LoadingButton type="submit" size="sm" variant="destructive" loading={busy === 'remove'}>
								Remove number
							</LoadingButton>
						</div>
					</form>
				{/if}
			{:else}
				<!-- Step one: the number. -->
				{#if data.codeUnsent && !form?.sendCode}
					<p class={errorClass} role="alert">
						Your account is ready, but we couldn't send a code to this number just now. Please try again.
					</p>
				{/if}
				<form
					method="post"
					action="?/sendCode"
					class="flex flex-col gap-3 sm:flex-row sm:items-start"
					use:enhance={submit('sendCode', false)}
				>
					<div class="flex-1">
						<AuthField
							name="phone"
							label={account.phone ? 'New phone number' : 'Phone number'}
							type="tel"
							placeholder="0912 345 678"
							autocomplete="tel"
							inputmode="tel"
							icon={Phone}
							value={form?.sendCode && 'phone' in form.sendCode
								? form.sendCode.phone
								: data.suggestedPhone
									? localPhone(data.suggestedPhone)
									: ''}
							errors={form?.sendCode && 'error' in form.sendCode ? [form.sendCode.error] : undefined}
							disabled={busy === 'sendCode'}
							hint="An Ethiopian mobile number (09… or 07…). We'll text you a code to confirm it."
						/>
					</div>
					<div class="flex gap-2 sm:mt-6">
						<LoadingButton type="submit" loading={busy === 'sendCode'} loadingText="Sending...">Send code</LoadingButton>
						{#if changing}
							<Button variant="ghost" onclick={() => (changing = false)}>Cancel</Button>
						{/if}
					</div>
				</form>
			{/if}
		</div>
	</section>

	<!-- Password -->
	<section class={sectionClass} aria-labelledby="password-heading">
		<div class="mb-5 flex items-start gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<Lock class="size-4" aria-hidden="true" />
			</span>
			<div>
				<h2 id="password-heading" class="text-lg font-bold text-foreground">
					{account.hasPassword ? 'Change password' : 'Set a password'}
				</h2>
				<p class="text-sm text-muted-foreground">
					{account.hasPassword
						? "You'll stay signed in here; other devices will be signed out."
						: 'You sign in with Google. Add a password to sign in with your email too.'}
				</p>
			</div>
		</div>
		<form method="post" action="?/password" class="space-y-4" use:enhance={submit('password')}>
			{#if account.hasPassword}
				<AuthField
					name="currentPassword"
					label="Current password"
					type="password"
					autocomplete="current-password"
					icon={Lock}
					errors={fieldError('currentPassword')}
					disabled={busy === 'password'}
				/>
			{/if}
			<div class="grid gap-4 sm:grid-cols-2">
				<AuthField
					name="newPassword"
					label="New password"
					type="password"
					autocomplete="new-password"
					icon={Lock}
					errors={fieldError('newPassword')}
					disabled={busy === 'password'}
				/>
				<AuthField
					name="confirmPassword"
					label="Confirm new password"
					type="password"
					autocomplete="new-password"
					icon={Lock}
					errors={fieldError('confirmPassword')}
					disabled={busy === 'password'}
				/>
			</div>
			<p class="text-xs text-muted-foreground">
				At least 8 characters, with an uppercase and a lowercase letter, a number and a symbol.
			</p>
			{#if passwordError && !passwordError.field}
				<p class={errorClass} role="alert">{passwordError.error}</p>
			{:else if form?.password && 'saved' in form.password}
				<p class={successClass} role="status">
					<CircleCheck class="size-4" aria-hidden="true" />
					{form.password.saved === 'set' ? 'Password set.' : 'Password changed.'}
				</p>
			{/if}
			<LoadingButton type="submit" loading={busy === 'password'} loadingText="Saving...">
				{account.hasPassword ? 'Change password' : 'Set password'}
			</LoadingButton>
		</form>
	</section>
</div>
