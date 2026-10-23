<script lang="ts">
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import WifiOff from '@lucide/svelte/icons/wifi-off';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	/*
	 * Served by the service worker when a page can't be reached and has no saved copy. It lives
	 * outside the public layout on purpose: no header data to load, so it can be cached at install.
	 */
</script>

<svelte:head>
	<title>{m.shell_offline_title()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="public-site flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center [padding-top:max(4rem,env(safe-area-inset-top))]"
>
	<a href={ROUTES.home} class="flex items-center gap-2">
		<span class="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
			<GraduationCap class="size-4" />
		</span>
		<span class="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
	</a>
	<span class="flex size-16 items-center justify-center rounded-full bg-muted">
		<WifiOff class="size-8 text-muted-foreground" aria-hidden="true" />
	</span>
	<div class="max-w-sm space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{m.shell_offline_title()}</h1>
		<p class="text-sm text-muted-foreground">
			{m.shell_offline_description()}
		</p>
	</div>
	<div class="flex flex-wrap items-center justify-center gap-3">
		<Button onclick={() => location.reload()}>
			<RotateCw class="size-4" />
			{m.shell_try_again()}
		</Button>
		<Button variant="outline" href={ROUTES.courses.list}>{m.shell_offline_browse_saved()}</Button>
	</div>
</main>
