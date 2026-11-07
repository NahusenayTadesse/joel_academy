<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import { setKitLabels } from '@nahu/admin-kit/labels';
	import AnnouncementBar from '$lib/components/layout/announcement-bar.svelte';
	import PublicFooter from '$lib/components/layout/public-footer.svelte';
	import PublicHeader from '$lib/components/layout/public-header.svelte';
	import AppTabBar from '$lib/components/pwa/app-tab-bar.svelte';
	import { m } from '$lib/paraglide/messages';
	import { wishlist } from '$lib/wishlist.svelte';

	let { data, children } = $props();

	// The kit's YouTube player speaks the site's language; read per render, so a language switch shows.
	setKitLabels(() => ({ youtubePlay: (title: string) => m.video_play({ title }), youtubeWatch: m.video_watch_on_youtube() }));

	// Hearts follow the account once signed in (and the browser's own list when not).
	$effect(() => {
		wishlist.sync(data.user ? data.wishlistIds : null);
	});
</script>

<Toaster
	position="top-right"
	richColors
	closeButton
	expand
	containerAriaLabel={m.shell_toast_region()}
	closeButtonAriaLabel={m.shell_toast_close()}
/>

<!-- Installed on a phone, the tab bar sits over the bottom: leave room for it. -->
<div
	class="public-site relative isolate flex min-h-screen flex-col overflow-x-clip standalone:max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]"
>
	<!-- Two soft colour clouds behind every page; gradients, so scrolling never repaints them. -->
	<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
		<div class="glow absolute -top-1/4 -left-1/4 size-[80vmax] opacity-[0.07]"></div>
		<div
			class="glow absolute -right-1/4 -bottom-1/4 size-[70vmax] opacity-[0.06]"
			style:--glow-color="var(--tertiary)"
		></div>
	</div>
	<AnnouncementBar announcement={data.announcement} />
	<PublicHeader user={data.user} categories={data.menuCategories} unreadNotifications={data.unreadNotifications} />
	<main id="main-content" class="flex-1">{@render children()}</main>
	<PublicFooter />
</div>
<AppTabBar signedIn={Boolean(data.user)} />
