<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import SearchX from '@lucide/svelte/icons/search-x';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import SearchBar from '$lib/components/courses/search-bar.svelte';
	import { formatDateTime } from '$lib/components/student/home/format';
	import PaymentDetailSheet from '$lib/components/student/home/payment-detail-sheet.svelte';
	import { PAYMENT_STATUS, type PaymentRecord } from '$lib/components/student/home/payment-status';
	import LinkTabs from '$lib/components/student/link-tabs.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { formatCurrency } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
	import { siteConfig } from '$lib/site';

	let { data } = $props();

	let selected = $state<PaymentRecord | null>(null);

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
			{ value: 'ALL', label: m.account_filter_all() },
			{ value: 'PENDING', label: m.account_pending() },
			{ value: 'APPROVED', label: m.account_status_approved() },
			{ value: 'DECLINED', label: m.account_status_declined() }
		].map((tab) => ({ ...tab, href: withParams({ status: tab.value === 'ALL' ? undefined : tab.value }) }))
	);
	const hasActiveFilters = $derived(data.filters.status !== 'ALL' || Boolean(data.filters.search));
	const warningText = 'text-[color-mix(in_srgb,var(--warning)_45%,black)] dark:text-warning';
</script>

<svelte:head>
	<title>{m.account_payments()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader title={m.account_payments()} description={m.account_payments_description()} />

	{#if data.hasPending}
		<p class="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm {warningText}">
			<Clock class="size-4 shrink-0" aria-hidden="true" />
			{m.account_payments_pending_note()}
		</p>
	{/if}

	<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="max-w-full overflow-x-auto">
			<LinkTabs label={m.account_filter_by_status()} {tabs} current={data.filters.status} />
		</div>
		<SearchBar
			placeholder={m.account_payments_search()}
			value={data.filters.search}
			onSearch={(value) => goto(withParams({ search: value || undefined }), { keepFocus: true, noScroll: true })}
			class="w-full sm:w-64"
		/>
	</div>

	{#if data.items.length === 0}
		{#if hasActiveFilters && data.total > 0}
			<EmptyState icon={SearchX} title={m.account_no_results()} description={m.account_no_results_description()}>
				{#snippet action()}
					<Button variant="outline" href={page.url.pathname}>{m.account_reset_filters()}</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState icon={CreditCard} title={m.account_no_payments()} description={m.account_no_payments_description()} />
		{/if}
	{:else}
		<!-- Phones: one card per payment. -->
		<ul class="flex flex-col gap-3 md:hidden">
			{#each data.items as payment (payment.key)}
				{@const status = PAYMENT_STATUS[payment.status]}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
						onclick={() => (selected = payment)}
					>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-medium text-foreground">{payment.courseTitle}</span>
							<span class="mt-0.5 block truncate text-xs text-muted-foreground">
								{payment.method}{payment.reference ? ` · ${payment.reference}` : ''}
							</span>
							<span class="mt-2 flex flex-wrap items-center gap-2 text-sm">
								<span class="font-medium text-foreground">{formatCurrency(payment.amount, payment.currency)}</span>
								<Badge variant={status.variant}>{status.label}</Badge>
							</span>
							<span class="mt-1 block text-xs text-muted-foreground">{formatDateTime(payment.submittedAt)}</span>
						</span>
						<ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>

		<div class="hidden overflow-hidden rounded-xl border border-border md:block">
			<table class="w-full caption-bottom text-sm">
				<thead class="[&_tr]:border-b">
					<tr class="border-b border-border">
						<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{m.account_course_details()}</th>
						<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{m.account_method()}</th>
						<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{m.account_date_time()}</th>
						<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{m.account_amount()}</th>
						<th class="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{m.account_status()}</th>
					</tr>
				</thead>
				<tbody class="[&_tr:last-child]:border-0">
					{#each data.items as payment (payment.key)}
						{@const status = PAYMENT_STATUS[payment.status]}
						<tr class="border-b border-border transition-colors hover:bg-muted/50">
							<td class="max-w-0 p-4 align-middle">
								<button
									type="button"
									class="block w-full min-w-0 cursor-pointer text-left hover:underline"
									onclick={() => (selected = payment)}
								>
									<span class="block truncate font-medium text-foreground">{payment.courseTitle}</span>
									<span class="block truncate text-xs text-muted-foreground">
										{payment.reference ?? m.account_no_reference()}
									</span>
								</button>
							</td>
							<td class="p-4 align-middle whitespace-nowrap text-muted-foreground">{payment.method}</td>
							<td class="p-4 align-middle whitespace-nowrap text-muted-foreground">
								{formatDateTime(payment.submittedAt)}
							</td>
							<td class="p-4 align-middle font-medium whitespace-nowrap text-foreground">
								{formatCurrency(payment.amount, payment.currency)}
							</td>
							<td class="p-4 align-middle"><Badge variant={status.variant}>{status.label}</Badge></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="text-center text-sm text-muted-foreground">
			{m.account_showing_transactions({ count: data.items.length })}
		</p>
	{/if}

	<PaymentDetailSheet payment={selected} onClose={() => (selected = null)} />
</div>
