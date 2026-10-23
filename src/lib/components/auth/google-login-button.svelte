<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Button from '$lib/components/ui/button.svelte';
	import { localizePath } from '$lib/i18n';
	import { m } from '$lib/paraglide/messages';

	/*
	 * The original's Google button. A plain form post: the server starts the OAuth flow and sends
	 * the browser to Google, so it works without JavaScript too.
	 */
	let { redirectTo, disabled = false }: { redirectTo?: string | null; disabled?: boolean } = $props();

	let connecting = $state(false);
</script>

<!-- Back from Google's page, the browser may restore this page as it was left: still "connecting". -->
<svelte:window onpageshow={(event) => event.persisted && (connecting = false)} />

<form method="post" action={localizePath('/login/google')} onsubmit={() => (connecting = true)}>
	{#if redirectTo}<HiddenField name="redirectTo" value={redirectTo} />{/if}
	<Button
		type="submit"
		variant="outline"
		class="w-full gap-2 transition-all duration-200"
		disabled={disabled || connecting}
		aria-busy={connecting}
	>
		{#if connecting}
			<LoaderCircle class="size-4 animate-spin text-brand-ink" aria-hidden="true" />
			<span>{m.account_google_connecting()}</span>
		{:else}
			<svg aria-hidden="true" viewBox="0 0 24 24" class="size-4">
				<path
					fill="#4285F4"
					d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.32 2.98-7.39Z"
				/>
				<path
					fill="#34A853"
					d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
				/>
				<path
					fill="#FBBC05"
					d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61Z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"
				/>
			</svg>
			<span>Google</span>
		{/if}
	</Button>
</form>
