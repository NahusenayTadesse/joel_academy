<script lang="ts">
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import StatusPage from '$lib/components/common/status-page.svelte';
	import { siteConfig } from '$lib/site';
</script>

<svelte:head>
	<title>Access denied · {siteConfig.name}</title>
</svelte:head>

<StatusPage
	icon={ShieldAlert}
	code="403"
	title="Access denied"
	description="You don't have permission to view this page."
/>
