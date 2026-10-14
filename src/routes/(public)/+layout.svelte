<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import AnnouncementBar from '$lib/components/layout/announcement-bar.svelte';
	import PublicFooter from '$lib/components/layout/public-footer.svelte';
	import PublicHeader from '$lib/components/layout/public-header.svelte';
	import AppTabBar from '$lib/components/pwa/app-tab-bar.svelte';
	import { wishlist } from '$lib/wishlist.svelte';

	let { data, children } = $props();

	// Hearts follow the account once signed in (and the browser's own list when not).
	$effect(() => {
		wishlist.sync(data.user ? data.wishlistIds : null);
	});
</script>

<Toaster position="top-right" richColors closeButton expand />

<!-- Installed on a phone, the tab bar sits over the bottom: leave room for it. -->
<div
	class="public-site flex min-h-screen flex-col standalone:max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]"
>
	<AnnouncementBar announcement={data.announcement} />
	<PublicHeader user={data.user} categories={data.menuCategories} unreadNotifications={data.unreadNotifications} />
	<main id="main-content" class="flex-1">{@render children()}</main>
	<PublicFooter />
</div>
<AppTabBar signedIn={Boolean(data.user)} />
