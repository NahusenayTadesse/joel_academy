<script lang="ts">
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';
	import AnnouncementBar from '$lib/components/layout/announcement-bar.svelte';
	import PublicFooter from '$lib/components/layout/public-footer.svelte';
	import PublicHeader from '$lib/components/layout/public-header.svelte';
	import AppTabBar from '$lib/components/pwa/app-tab-bar.svelte';
	import { wishlist } from '$lib/wishlist.svelte';

	let { data, children } = $props();

	onMount(() => wishlist.load());
</script>

<Toaster position="top-right" richColors closeButton expand />

<!-- Installed on a phone, the tab bar sits over the bottom: leave room for it. -->
<div
	class="public-site flex min-h-screen flex-col standalone:max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]"
>
	<AnnouncementBar announcement={data.announcement} />
	<PublicHeader user={data.user} categories={data.menuCategories} />
	<div class="flex-1">{@render children()}</div>
	<PublicFooter />
</div>
<AppTabBar signedIn={Boolean(data.user)} />
