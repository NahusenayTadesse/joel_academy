<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import PwaManager from '$lib/components/pwa/pwa-manager.svelte';

	let { children } = $props();
</script>

<!-- Light by default with no system preference, as the original site's theme provider was. -->
<!-- themeColors keeps the installed app's title/status bar matched to the theme. -->
<ModeWatcher
	defaultMode="light"
	track={false}
	disableTransitions
	themeColors={{ light: '#f6fafd', dark: '#050b17' }}
/>
<PwaManager />
{@render children()}
