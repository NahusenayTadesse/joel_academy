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
	import { m } from '$lib/paraglide/messages';
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
			{ value: 'ALL', label: m.learn_tab_all() },
			{ value: 'UNREAD', label: m.learn_tab_unread() },
			{ value: 'READ', label: m.learn_tab_read() }
		].map((tab) => ({ ...tab, href: withParams({ read: tab.value === 'ALL' ? undefined : tab.value, shown: undefined }) }))
	);
	const hasActiveFilters = $derived(data.filters.read !== 'ALL' || Boolean(data.filters.search));
	const hasUnread = $derived(data.unreadNotifications > 0);
</script>

<svelte:head>
	<title>{m.learn_notifications()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
	<PageHeader title={m.learn_notifications()} description={m.learn_notifications_desc()}>
		{#snippet actions()}
			{#if hasUnread}
				<ActionForm action="?/readAll" submit={() => {
						marking = true;
						return async ({ result, update }) => {
							marking = false;
							if (result.type === 'success') toast.success(m.learn_notifications_all_read());
							else toast.error(m.learn_notifications_mark_failed(), { description: m.learn_try_again() });
							await update();
						};
					}}>
					<Button type="submit" variant="outline" size="sm" class="gap-2" disabled={marking}>
						<CheckCheck class="size-4" />
						{m.learn_mark_all_as_read()}
					</Button>
				</ActionForm>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<LinkTabs label={m.learn_filter_read()} {tabs} current={data.filters.read} />
		<SearchBar
			placeholder={m.learn_search_notifications()}
			value={data.filters.search}
			onSearch={(value) => goto(withParams({ search: value || undefined, shown: undefined }), { keepFocus: true, noScroll: true })}
			class="w-full sm:w-64"
		/>
	</div>

	{#if data.items.length === 0}
		{#if hasActiveFilters}
			<EmptyState icon={SearchX} title={m.learn_no_results()} description={m.learn_no_results_desc()}>
				{#snippet action()}
					<Button variant="outline" href={page.url.pathname}>{m.learn_reset_filters()}</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState icon={Bell} title={m.learn_caught_up_title()} description={m.learn_caught_up_desc()} />
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
					{m.learn_load_more()}
				</Button>
			</div>
		{/if}
	{/if}
</div>
