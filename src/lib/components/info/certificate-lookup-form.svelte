<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { Tabs } from 'bits-ui';
	import Camera from '@lucide/svelte/icons/camera';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Search from '@lucide/svelte/icons/search';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';
	import CertificateQrScanner from './certificate-qr-scanner.svelte';
	import { extractVerificationIdentifier, type CertificateVerification } from './certificate-verification';
	import CertificateVerificationResult from './certificate-verification-result.svelte';

	/*
	 * The lookup runs on the server: submitting navigates to `?token=…`, whose load returns `result`.
	 * That keeps one verification path, and the form still works as a plain GET without JavaScript.
	 */
	let {
		initialIdentifier = '',
		result = null,
		defaultTab = 'manual'
	}: {
		initialIdentifier?: string;
		result?: CertificateVerification | null;
		defaultTab?: 'manual' | 'qr';
	} = $props();

	// svelte-ignore state_referenced_locally
	let activeTab = $state(defaultTab);
	// svelte-ignore state_referenced_locally
	let code = $state(initialIdentifier);

	const isVerifying = $derived(navigating.to?.url.pathname === ROUTES.certificates.verifyLookup);

	const tabTriggerClass =
		'inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm';
	const tabContentClass =
		'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

	function handleManualSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!code.trim() || isVerifying) return;
		const identifier = extractVerificationIdentifier(code);
		if (!identifier) return;
		void goto(`${ROUTES.certificates.verifyLookup}?token=${encodeURIComponent(identifier)}`, {
			noScroll: true,
			keepFocus: true
		});
	}

	function handleReset() {
		code = '';
		void goto(ROUTES.certificates.verifyLookup, { noScroll: true });
	}
</script>

{#if result}
	<div class="w-full">
		<CertificateVerificationResult {result} onVerifyAnother={handleReset} />
	</div>
{:else}
	<div class="w-full space-y-6">
		<Tabs.Root bind:value={activeTab} class="w-full">
			<Tabs.List
				class={cn(
					'inline-flex h-10 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground',
					'grid w-full grid-cols-2 p-1'
				)}
			>
				<Tabs.Trigger value="manual" class={cn(tabTriggerClass, 'gap-2 text-xs sm:text-sm')}>
					<KeyRound class="size-4" />
					{m.info_verify_tab_manual()}
				</Tabs.Trigger>
				<Tabs.Trigger value="qr" class={cn(tabTriggerClass, 'gap-2 text-xs sm:text-sm')}>
					<Camera class="size-4" />
					{m.info_verify_tab_qr()}
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="manual" class={cn(tabContentClass, 'mt-6 space-y-4')}>
				<form
					method="GET"
					action={ROUTES.certificates.verifyLookup}
					onsubmit={handleManualSubmit}
					class="space-y-4"
				>
					<div class="space-y-2 text-left">
						<Label
							for="certificate-code"
							class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>
							{m.info_verify_code_label()}
						</Label>
						<div class="relative">
							<Input
								id="certificate-code"
								name="token"
								bind:value={code}
								placeholder={m.info_verify_code_placeholder()}
								autocomplete="off"
								disabled={isVerifying}
								class="h-11 pr-10 font-mono text-sm tracking-wide"
							/>
							<div
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
							>
								<ShieldCheck class="size-4" />
							</div>
						</div>
						<p class="text-xs text-muted-foreground">
							{m.info_verify_code_hint_before()}
							<span class="font-mono font-medium text-foreground">JTA-2026-...</span
							>{m.info_verify_code_hint_after()}
						</p>
					</div>

					<Button
						type="submit"
						disabled={!code.trim() || isVerifying}
						class="h-11 w-full gap-2 font-medium shadow-sm"
					>
						{#if isVerifying}
							<LoaderCircle class="size-4 animate-spin" />
							{m.info_verify_submitting()}
						{:else}
							<Search class="size-4" />
							{m.info_verify_submit()}
						{/if}
					</Button>
				</form>
			</Tabs.Content>

			<Tabs.Content value="qr" class={cn(tabContentClass, 'mt-6 space-y-4')}>
				<div class="text-center text-xs text-muted-foreground">
					{m.info_verify_qr_hint()}
				</div>
				<CertificateQrScanner onSwitchToManual={() => (activeTab = 'manual')} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
{/if}
