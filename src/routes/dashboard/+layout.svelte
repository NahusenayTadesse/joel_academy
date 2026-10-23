<script lang="ts">
	import './dashboard.css';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import LogOut from '@lucide/svelte/icons/log-out';
	import { Toaster, toast } from 'svelte-sonner';
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Sidebar from '@nahu/admin-kit/components/ui/sidebar/index.js';
	import KitProvider from '@nahu/admin-kit/components/KitProvider.svelte';
	import AppSidebar from '@nahu/admin-kit/components/shell/AppSidebar.svelte';
	import Search from '@nahu/admin-kit/components/shell/Search.svelte';
	import DarkMode from '@nahu/admin-kit/components/shell/DarkMode.svelte';
	import { access } from '$lib/access';
	import { ENTITIES, NAVIGATION } from '$lib/navigation';

	let { data, children } = $props();

	/*
	 * The kit's lookup delete answers with a flash message rather than a form message; this shows
	 * it. Form saves toast through `createForm` on their own.
	 */
	const flash = getFlash(page);
	$effect(() => {
		if (!$flash) return;
		if ($flash.type === 'error') toast.error($flash.message);
		else toast.success($flash.message);
		$flash = undefined;
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<Toaster richColors />

<KitProvider
	{access}
	navigation={NAVIGATION}
	entities={ENTITIES}
	permList={data.permList}
	isSuperAdmin={data.isSuperAdmin}
>
	<Sidebar.Provider>
		<AppSidebar footer={data.user?.email ?? ''}>
			{#snippet logo()}
				<span class="flex items-center gap-2 text-lg font-bold">
					<span
						class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground"
						>JT</span
					>
					Dashboard
				</span>
			{/snippet}
		</AppSidebar>
		<main class="min-w-0 flex-1 px-2">
			<div
				class="sticky top-2 z-50 flex items-center justify-between rounded-lg p-2 shadow-lg backdrop-blur-md"
			>
				<Sidebar.Trigger />
				<div class="flex items-center gap-2">
					<Search />
					<Button href="/" target="_blank" variant="ghost" size="sm">
						<ExternalLink class="h-4 w-4" /> View site
					</Button>
					<DarkMode />
					<form method="post" action="/logout">
						<Button type="submit" variant="ghost" size="sm">
							<LogOut class="h-4 w-4" /> Sign out
						</Button>
					</form>
				</div>
			</div>
			<div class="p-2 pt-4">
				{@render children()}
			</div>
		</main>
	</Sidebar.Provider>
</KitProvider>
