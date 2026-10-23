<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import SearchX from '@lucide/svelte/icons/search-x';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import SearchBar from '$lib/components/courses/search-bar.svelte';
	import Select from '$lib/components/courses/select.svelte';
	import CertificateCard from '$lib/components/student/certificate-card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const STATUS_OPTIONS = [
		{ value: 'ALL', label: m.learn_all_statuses() },
		{ value: 'ISSUED', label: m.learn_issued() },
		{ value: 'REVOKED', label: m.learn_revoked() }
	];
	const SORT_OPTIONS = [
		{ value: 'newest', label: m.learn_newest_first() },
		{ value: 'oldest', label: m.learn_oldest_first() }
	];

	function setFilter(key: string, value: string | undefined) {
		const params = new URLSearchParams(page.url.searchParams);
		if (value) params.set(key, value);
		else params.delete(key);
		const query = params.toString();
		goto(query ? `?${query}` : page.url.pathname, { keepFocus: true, noScroll: true, replaceState: true });
	}

	const hasActiveFilters = $derived(data.filters.status !== 'ALL' || Boolean(data.filters.search));
</script>

<svelte:head>
	<title>{m.learn_certificates()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader title={m.learn_certificates()} description={m.learn_certificates_desc()} />

	<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
		<div class="flex flex-wrap items-center gap-2">
			<SearchBar
				placeholder={m.learn_certificates_search()}
				value={data.filters.search}
				onSearch={(value) => setFilter('search', value || undefined)}
				class="w-full sm:w-64"
			/>
			<Select
				value={data.filters.status}
				items={STATUS_OPTIONS}
				onValueChange={(value) => setFilter('status', value === 'ALL' ? undefined : value)}
				class="w-40"
			/>
			<Select
				value={data.filters.sort}
				items={SORT_OPTIONS}
				onValueChange={(value) => setFilter('sort', value === 'newest' ? undefined : value)}
				class="w-40"
			/>
		</div>
	</div>

	{#if data.items.length === 0}
		{#if hasActiveFilters && data.total > 0}
			<EmptyState icon={SearchX} title={m.learn_no_results()} description={m.learn_no_results_desc()}>
				{#snippet action()}
					<Button variant="outline" href={page.url.pathname}>{m.learn_reset_filters()}</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState
				icon={Award}
				title={m.learn_no_certificates_title()}
				description={m.learn_no_certificates_desc()}
			>
				{#snippet action()}
					<Button href={ROUTES.student.courses}>{m.learn_view_my_courses()}</Button>
				{/snippet}
			</EmptyState>
		{/if}
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.items as certificate (certificate.id)}
				<CertificateCard {certificate} href={ROUTES.student.certificate(certificate.code)} />
			{/each}
		</div>
	{/if}
</div>
