<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import PwaManager from '$lib/components/pwa/pwa-manager.svelte';
	import AnalyticsBeacon from '$lib/components/analytics-beacon.svelte';
	// The same files layout.css's @font-face rules use (Vite gives both one hashed URL).
	import sansFont from '@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url';
	import headingFont from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url';

	let { children } = $props();
</script>

<svelte:head>
	<!-- Fetched with the stylesheet instead of after it, so text paints in the brand fonts sooner. -->
	<link rel="preload" href={sansFont} as="font" type="font/woff2" crossorigin="anonymous" />
	<link rel="preload" href={headingFont} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<!-- Light by default with no system preference, as the original site's theme provider was. -->
<!-- themeColors keeps the installed app's title/status bar matched to the theme. -->
<ModeWatcher
	defaultMode="light"
	track={false}
	disableTransitions
	themeColors={{ light: '#f6fafd', dark: '#050b17' }}
/>
<PwaManager />
<AnalyticsBeacon />
{@render children()}
