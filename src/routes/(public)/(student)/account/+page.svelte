<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import MessageSquareText from '@lucide/svelte/icons/message-square-text';
	import Phone from '@lucide/svelte/icons/phone';
	import User from '@lucide/svelte/icons/user';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AuthField from '$lib/components/auth/auth-field.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import LoadingButton from '$lib/components/ui/loading-button.svelte';
	import { localPhone } from '$lib/phone';
	import { m } from '$lib/paraglide/messages';
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
	<title>{m.account_account_title()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
	<PageHeader title={m.account_account_title()} description={m.account_account_description()} />

	<!-- Profile -->
	<section class={sectionClass} aria-labelledby="profile-heading">
		<div class="mb-5 flex items-center gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<User class="size-4" aria-hidden="true" />
			</span>
			<h2 id="profile-heading" class="text-lg font-bold text-foreground">{m.account_profile()}</h2>
		</div>
		<ActionForm action="?/profile" class="space-y-4" submit={submit('profile', false)}>
			<AuthField
				name="name"
				label={m.account_full_name()}
				autocomplete="name"
				icon={User}
				value={account.name}
				errors={form?.profile && 'error' in form.profile ? [form.profile.error] : undefined}
				disabled={busy === 'profile'}
			/>
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label for="email">{m.account_email_label()}</Label>
					{#if account.emailVerified}
						<Badge variant="success">{m.account_verified()}</Badge>
					{:else}
						<Badge variant="warning">{m.account_not_confirmed()}</Badge>
					{/if}
				</div>
				<div class="relative">
					<Mail
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input id="email" type="email" value={account.email} readonly class="pl-9 text-muted-foreground" />
				</div>
				<p class="text-xs text-muted-foreground">{m.account_email_locked()}</p>
			</div>
			{#if form?.profile && 'saved' in form.profile}
				<p class={successClass} role="status"><CircleCheck class="size-4" aria-hidden="true" /> {m.account_profile_saved()}</p>
			{/if}
			<LoadingButton type="submit" loading={busy === 'profile'} loadingText={m.account_saving()}>{m.account_save_profile()}</LoadingButton>
		</ActionForm>
	</section>

	<!-- Phone -->
	<section class={sectionClass} aria-labelledby="phone-heading">
		<div class="mb-5 flex items-start gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
				<MessageSquareText class="size-4" aria-hidden="true" />
			</span>
			<div>
				<h2 id="phone-heading" class="text-lg font-bold text-foreground">{m.account_phone_number()}</h2>
				<p class="text-sm text-muted-foreground">
					{m.account_phone_section_description()}
				</p>
			</div>
		</div>

		<div class="space-y-4">
			{#if form?.verifyCode && 'verified' in form.verifyCode}
				<div class="flex flex-col gap-3 rounded-lg bg-success/10 p-3 sm:flex-row sm:items-center sm:justify-between" role="status">
					<p class="flex items-center gap-2 text-sm text-success-ink">
						<CircleCheck class="size-4 shrink-0" aria-hidden="true" />
						{m.account_phone_verified_msg({ phone: localPhone(form.verifyCode.verified) })}
					</p>
					<Button size="sm" variant="outline" href={data.continueTo ?? ROUTES.student.courses} class="shrink-0">
						{data.continueTo ? m.account_continue() : m.account_go_to_my_courses()}
					</Button>
				</div>
			{:else if form?.removePhone}
				<p class={successClass} role="status">
					<CircleCheck class="size-4" aria-hidden="true" /> {m.account_phone_removed()}
				</p>
			{/if}

			{#if data.pendingPhone}
				<!-- Step two: the code. -->
				<div class="rounded-lg border border-brand/30 bg-brand/5 p-4">
					<p class="text-sm text-foreground">
						{m.account_code_sent_before()}
						<span class="font-semibold">{localPhone(data.pendingPhone)}</span>{m.account_code_sent_after()}
					</p>
					<ActionForm action="?/verifyCode" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start" submit={submit('verifyCode')}>
						<div class="sm:w-48">
							<AuthField
								name="code"
								label={m.account_verification_code()}
								placeholder="123456"
								autocomplete="one-time-code"
								inputmode="numeric"
								maxlength={6}
								icon={KeyRound}
								errors={form?.verifyCode && 'error' in form.verifyCode ? [form.verifyCode.error] : undefined}
								disabled={busy === 'verifyCode'}
							/>
						</div>
						<LoadingButton type="submit" class="sm:mt-6" loading={busy === 'verifyCode'} loadingText={m.account_checking()}>
							{m.account_verify_number()}
						</LoadingButton>
					</ActionForm>
					<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						<ActionForm action="?/sendCode" submit={submit('resend')}>
							<HiddenField name="phone" value={data.pendingPhone} />
							<button
								type="submit"
								class="font-medium text-brand-ink hover:underline disabled:opacity-50"
								disabled={busy === 'resend'}
							>
								{busy === 'resend' ? m.account_sending() : m.account_send_new_code()}
							</button>
						</ActionForm>
						<ActionForm action="?/cancelCode" submit={submit('cancel')}>
							<button type="submit" class="text-muted-foreground hover:text-foreground hover:underline">
								{m.account_use_different_number()}
							</button>
						</ActionForm>
					</div>
					{#if form?.sendCode && 'error' in form.sendCode}
						<p class="mt-3 {errorClass}" role="alert">{form.sendCode.error}</p>
					{:else if form?.sendCode && 'sent' in form.sendCode}
						<p class="mt-3 text-sm text-muted-foreground" role="status">{m.account_new_code_sent()}</p>
					{/if}
				</div>
			{:else if account.phone && !changing}
				<!-- A verified number. -->
				<div class="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-3">
						<Phone class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="font-medium text-foreground">{localPhone(account.phone)}</span>
						<Badge variant="success" class="gap-1"><BadgeCheck class="size-3" aria-hidden="true" /> {m.account_verified()}</Badge>
					</div>
					<div class="flex flex-wrap gap-2">
						<Button size="sm" variant="outline" onclick={() => ((changing = true), (confirmingRemove = false))}>
							{m.account_change_number()}
						</Button>
						{#if !confirmingRemove}
							<Button size="sm" variant="ghost" class="text-destructive" onclick={() => (confirmingRemove = true)}>
								{m.account_remove()}
							</Button>
						{/if}
					</div>
				</div>
				{#if confirmingRemove}
					<ActionForm action="?/removePhone" class="flex flex-col gap-3 rounded-lg bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between" submit={submit('remove')}>
						<p class="text-sm text-foreground">{m.account_remove_confirm()}</p>
						<div class="flex shrink-0 gap-2">
							<Button size="sm" variant="ghost" onclick={() => (confirmingRemove = false)}>{m.account_keep_it()}</Button>
							<LoadingButton type="submit" size="sm" variant="destructive" loading={busy === 'remove'}>
								{m.account_remove_number()}
							</LoadingButton>
						</div>
					</ActionForm>
				{/if}
			{:else}
				<!-- Step one: the number. -->
				{#if data.codeUnsent && !form?.sendCode}
					<p class={errorClass} role="alert">
						{m.account_code_unsent()}
					</p>
				{/if}
				<ActionForm action="?/sendCode" class="flex flex-col gap-3 sm:flex-row sm:items-start" submit={submit('sendCode', false)}>
					<div class="flex-1">
						<AuthField
							name="phone"
							label={account.phone ? m.account_new_phone_number() : m.account_phone_number()}
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
							hint={m.account_phone_hint()}
						/>
					</div>
					<div class="flex gap-2 sm:mt-6">
						<LoadingButton type="submit" loading={busy === 'sendCode'} loadingText={m.account_sending()}>{m.account_send_code()}</LoadingButton>
						{#if changing}
							<Button variant="ghost" onclick={() => (changing = false)}>{m.account_cancel()}</Button>
						{/if}
					</div>
				</ActionForm>
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
					{account.hasPassword ? m.account_change_password() : m.account_set_a_password()}
				</h2>
				<p class="text-sm text-muted-foreground">
					{account.hasPassword ? m.account_password_change_note() : m.account_password_google_note()}
				</p>
			</div>
		</div>
		<ActionForm action="?/password" class="space-y-4" submit={submit('password')}>
			{#if account.hasPassword}
				<AuthField
					name="currentPassword"
					label={m.account_current_password()}
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
					label={m.account_new_password()}
					type="password"
					autocomplete="new-password"
					icon={Lock}
					errors={fieldError('newPassword')}
					disabled={busy === 'password'}
				/>
				<AuthField
					name="confirmPassword"
					label={m.account_confirm_new_password()}
					type="password"
					autocomplete="new-password"
					icon={Lock}
					errors={fieldError('confirmPassword')}
					disabled={busy === 'password'}
				/>
			</div>
			<p class="text-xs text-muted-foreground">
				{m.account_password_rules()}
			</p>
			{#if passwordError && !passwordError.field}
				<p class={errorClass} role="alert">{passwordError.error}</p>
			{:else if form?.password && 'saved' in form.password}
				<p class={successClass} role="status">
					<CircleCheck class="size-4" aria-hidden="true" />
					{form.password.saved === 'set' ? m.account_password_set() : m.account_password_changed()}
				</p>
			{/if}
			<LoadingButton type="submit" loading={busy === 'password'} loadingText={m.account_saving()}>
				{account.hasPassword ? m.account_change_password() : m.account_set_password()}
			</LoadingButton>
		</ActionForm>
	</section>
</div>
