<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import Bell from '@lucide/svelte/icons/bell';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import SearchX from '@lucide/svelte/icons/search-x';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import SearchBar from '$lib/components/courses/search-bar.svelte';
	import NotificationCard from '$lib/components/student/home/notification-card.svelte';
	import LinkTabs from '$lib/components/student/link-tabs.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	let marking = $state(false);

	function withParams(changes: Record<string, string | undefined>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		const query = params.toString();
		return query ? `?${query}` : page.url.pathname;
	}

	const tabs = $derived(
		[
			{ value: 'ALL', label: 'All' },
			{ value: 'UNREAD', label: 'Unread' },
			{ value: 'READ', label: 'Read' }
		].map((tab) => ({ ...tab, href: withParams({ read: tab.value === 'ALL' ? undefined : tab.value, shown: undefined }) }))
	);
	const hasActiveFilters = $derived(data.filters.read !== 'ALL' || Boolean(data.filters.search));
	const hasUnread = $derived(data.unreadNotifications > 0);
</script>

<svelte:head>
	<title>Notifications · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
	<PageHeader title="Notifications" description="Updates about your courses and account.">
		{#snippet actions()}
			{#if hasUnread}
				<ActionForm action="?/readAll" submit={() => {
						marking = true;
						return async ({ result, update }) => {
							marking = false;
							if (result.type === 'success') toast.success('All notifications marked as read');
							else toast.error('Could not mark notifications as read', { description: 'Please try again.' });
							await update();
						};
					}}>
					<Button type="submit" variant="outline" size="sm" class="gap-2" disabled={marking}>
						<CheckCheck class="size-4" />
						Mark all as read
					</Button>
				</ActionForm>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<LinkTabs label="Filter by read state" {tabs} current={data.filters.read} />
		<SearchBar
			placeholder="Search notifications..."
			value={data.filters.search}
			onSearch={(value) => goto(withParams({ search: value || undefined, shown: undefined }), { keepFocus: true, noScroll: true })}
			class="w-full sm:w-64"
		/>
	</div>

	{#if data.items.length === 0}
		{#if hasActiveFilters}
			<EmptyState icon={SearchX} title="No results found" description="Try adjusting your search or filters.">
				{#snippet action()}
					<Button variant="outline" href={page.url.pathname}>Reset filters</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState icon={Bell} title="You're all caught up" description="New notifications will appear here." />
		{/if}
	{:else}
		<ul class="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
			{#each data.items as notification (notification.id)}
				<li><NotificationCard {notification} /></li>
			{/each}
		</ul>
		{#if data.hasMore}
			<div class="flex justify-center">
				<Button variant="outline" href={withParams({ shown: String(data.shown + data.pageSize) })} data-sveltekit-noscroll>
					Load more
				</Button>
			</div>
		{/if}
	{/if}
</div>
