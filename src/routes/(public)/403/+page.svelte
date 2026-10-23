<script lang="ts">
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import StatusPage from '$lib/components/common/status-page.svelte';
	import { m } from '$lib/paraglide/messages';
	import { siteConfig } from '$lib/site';
</script>

<svelte:head>
	<title>{m.shell_error_forbidden_title()} · {siteConfig.name}</title>
</svelte:head>

<StatusPage
	icon={ShieldAlert}
	code="403"
	title={m.shell_error_forbidden_title()}
	description={m.shell_error_forbidden_description()}
/>
