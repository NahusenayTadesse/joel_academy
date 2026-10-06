<script lang="ts">
	import { page } from '$app/state';
	import OctagonAlert from '@lucide/svelte/icons/octagon-alert';
	import SearchX from '@lucide/svelte/icons/search-x';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import StatusPage from '$lib/components/common/status-page.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	// The original had a not-found page and a catch-all error page; a thrown 403 reuses the look of
	// the /403 page so a guard can `error(403)` without redirecting.
	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{siteConfig.name}</title>
	<meta name="description" content="Digital Construct learning management system" />
	<meta name="robots" content="noindex" />
</svelte:head>

{#if status === 404}
	<StatusPage
		icon={SearchX}
		code="404"
		title="Page not found"
		description="The page you're looking for doesn't exist or may have been moved."
	>
		{#snippet action()}
			<Button href={ROUTES.courses.list}>Browse courses</Button>
		{/snippet}
	</StatusPage>
{:else if status === 403}
	<StatusPage
		icon={ShieldAlert}
		code="403"
		title="Access denied"
		description="You don't have permission to view this page."
	/>
{:else}
	<StatusPage
		icon={OctagonAlert}
		code={String(status)}
		title="Something went wrong"
		description="An unexpected error occurred on our end. Please try again."
	>
		{#snippet action()}
			<!-- A full reload re-runs the failed load, the closest match to React's error-boundary reset. -->
			<Button onclick={() => location.reload()}>Try again</Button>
		{/snippet}
	</StatusPage>
{/if}
