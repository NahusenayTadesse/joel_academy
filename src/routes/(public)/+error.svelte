<script lang="ts">
	import { page } from '$app/state';
	import OctagonAlert from '@lucide/svelte/icons/octagon-alert';
	import SearchX from '@lucide/svelte/icons/search-x';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import StatusPage from '$lib/components/common/status-page.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	// The original had a not-found page and a catch-all error page; a thrown 403 reuses the look of
	// the /403 page so a guard can `error(403)` without redirecting.
	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{siteConfig.name}</title>
	<meta name="description" content={m.shell_error_meta_description()} />
	<meta name="robots" content="noindex" />
</svelte:head>

{#if status === 404}
	<StatusPage
		icon={SearchX}
		code="404"
		title={m.shell_error_not_found_title()}
		description={m.shell_error_not_found_description()}
	>
		{#snippet action()}
			<Button href={ROUTES.courses.list}>{m.shell_error_browse_courses()}</Button>
		{/snippet}
	</StatusPage>
{:else if status === 403}
	<StatusPage
		icon={ShieldAlert}
		code="403"
		title={m.shell_error_forbidden_title()}
		description={m.shell_error_forbidden_description()}
	/>
{:else}
	<StatusPage
		icon={OctagonAlert}
		code={String(status)}
		title={m.shell_error_generic_title()}
		description={m.shell_error_generic_description()}
	>
		{#snippet action()}
			<!-- A full reload re-runs the failed load, the closest match to React's error-boundary reset. -->
			<Button onclick={() => location.reload()}>{m.shell_try_again()}</Button>
		{/snippet}
	</StatusPage>
{/if}
