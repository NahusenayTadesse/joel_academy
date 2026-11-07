<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Send from '@lucide/svelte/icons/send';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';
	import { Textarea } from '@nahu/admin-kit/components/ui/textarea/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { dateTime } from '../format';
	import { kindLabel as emailKindLabel } from '../emails/preview';

	let { data, form } = $props();

	type Row = (typeof data.rows)[number];

	const kindLabel = (kind: string) => (kind === 'otp' ? 'Verification code' : emailKindLabel(kind));

	const STATUS = {
		SENT: { badge: 'success', label: 'Sent' },
		SKIPPED: { badge: 'skipped', label: 'Skipped' },
		FAILED: { badge: 'failed', label: 'Failed' }
	} as const;

	/** A filter link that keeps the other filters. */
	function filterHref(changes: { status?: string | null; kind?: string | null; number?: string | null }) {
		const params = new URLSearchParams();
		const status = 'status' in changes ? changes.status : data.status;
		const kind = 'kind' in changes ? changes.kind : data.kind;
		const number = 'number' in changes ? changes.number : data.number;
		if (status) params.set('status', status);
		if (kind) params.set('kind', kind);
		if (number) params.set('number', number);
		const query = params.toString();
		return query ? `?${query}` : '?';
	}

	const total = $derived(data.counts.SENT + data.counts.SKIPPED + data.counts.FAILED);
	const statusTabs = $derived([
		{ key: null, label: 'All', count: total },
		{ key: 'SENT', label: 'Sent', count: data.counts.SENT },
		{ key: 'SKIPPED', label: 'Skipped', count: data.counts.SKIPPED },
		{ key: 'FAILED', label: 'Failed', count: data.counts.FAILED }
	]);

	let sending = $state(false);

	const columns: ColumnDef<Row>[] = [
		{
			id: 'createdAt',
			accessorFn: (row) => new Date(row.createdAt).getTime(),
			header: 'Date',
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{
			id: 'to',
			accessorKey: 'to',
			header: 'To',
			cell: ({ row }) => renderSnippet(toCell, row.original)
		},
		{ id: 'kind', accessorFn: (row) => kindLabel(row.kind), header: 'Kind' },
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderSnippet(statusCell, row.original)
		},
		{
			id: 'error',
			accessorFn: (row) => row.error ?? '',
			header: 'Error',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(errorCell, row.original)
		},
		{
			id: 'message',
			accessorKey: 'message',
			header: 'Message',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(messageCell, row.original)
		}
	];
</script>

{#snippet toCell(row: Row)}
	<span class="font-mono text-xs tabular-nums">{row.to}</span>
{/snippet}

{#snippet statusCell(row: Row)}
	<Statuses status={STATUS[row.status].badge} label={STATUS[row.status].label} />
{/snippet}

{#snippet errorCell(row: Row)}
	{#if row.error}
		<span class="text-xs text-destructive"><BigText text={row.error} max={40} /></span>
	{:else}
		<span class="text-xs text-muted-foreground">—</span>
	{/if}
{/snippet}

{#snippet messageCell(row: Row)}
	<span class="text-xs"><BigText text={row.message} max={60} /></span>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="SMS log"
		description="Every text the academy tried to send through GeezSMS: verification codes, enrollment, payment and certificate updates, and staff alerts."
	/>

	{#if !data.smsConfigured}
		<Notice tone="info" title="Texts are not being delivered.">
			No GeezSMS key is set (SMS_KEY), so texts are kept here as Skipped instead of being sent. Verification codes can be read
			from the message column.
		</Notice>
	{/if}

	<PageSection
		title="Send a test SMS"
		hint="Check the GeezSMS key and sender id with one real text. It costs balance like any other, and is limited to a few per number per hour."
	>
		<Card.Root>
			<Card.Content class="pt-6">
				<ActionForm action="?/test" class="grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] md:items-end" submit={() => {
						sending = true;
						return async ({ update }) => {
							await update({ reset: false });
							sending = false;
						};
					}}>
					<div class="flex flex-col gap-2">
						<Label for="test-phone">Phone number</Label>
						<Input
							id="test-phone"
							name="phone"
							type="tel"
							inputmode="tel"
							placeholder="0912 345 678"
							value={form?.phone ?? ''}
							required
						/>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="test-message">Message</Label>
						<Textarea
							id="test-message"
							name="message"
							rows={1}
							maxlength={300}
							value={form?.message ?? 'Test message from the dashboard. If you got this, SMS works.'}
							required
						/>
					</div>
					<Button type="submit" disabled={sending}>
						<Send class="size-4" />
						{sending ? 'Sending…' : 'Send test'}
					</Button>
				</ActionForm>
				<p class="mt-3 text-xs text-muted-foreground">
					Texts start with “Ethio AI School:”.
					{data.senderId ? 'Sent from the sender id in SMS_SHORTCODE_ID.' : 'Sent from the GeezSMS account’s default sender (no SMS_SHORTCODE_ID).'}
					{data.staffPhones
						? `${data.staffPhones} staff number${data.staffPhones === 1 ? '' : 's'} in ADMIN_NOTIFY_PHONE get new-receipt and contact alerts.`
						: 'No staff numbers in ADMIN_NOTIFY_PHONE.'}
				</p>
				{#if form?.error}
					<Notice tone="danger" class="mt-4">{form.error}</Notice>
				{:else if form?.status === 'SENT'}
					<Notice tone="success" class="mt-4">GeezSMS accepted the text. It should arrive in a moment.</Notice>
				{:else if form?.status === 'FAILED'}
					<Notice tone="danger" title="GeezSMS refused the text." class="mt-4">{form.sendError}</Notice>
				{:else if form?.status === 'SKIPPED'}
					<Notice tone="info" class="mt-4">Logged as Skipped: no SMS_KEY is set, so nothing was sent.</Notice>
				{/if}
			</Card.Content>
		</Card.Root>
	</PageSection>

	<div class="flex flex-col gap-3">
		<nav class="flex flex-wrap gap-2" aria-label="Filter by status">
			{#each statusTabs as tab (tab.label)}
				<Button
					href={filterHref({ status: tab.key })}
					variant={data.status === tab.key ? 'default' : 'outline'}
					size="sm"
					aria-current={data.status === tab.key ? 'page' : undefined}
				>
					{tab.label}
					<span class="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">{tab.count}</span>
				</Button>
			{/each}
		</nav>
		{#if data.kinds.length}
			<nav class="flex flex-wrap gap-2" aria-label="Filter by kind">
				<Button
					href={filterHref({ kind: null })}
					variant={data.kind === null ? 'secondary' : 'ghost'}
					size="sm"
					aria-current={data.kind === null ? 'page' : undefined}
				>
					Every kind
				</Button>
				{#each data.kinds as option (option.kind)}
					<Button
						href={filterHref({ kind: option.kind })}
						variant={data.kind === option.kind ? 'secondary' : 'ghost'}
						size="sm"
						aria-current={data.kind === option.kind ? 'page' : undefined}
					>
						{kindLabel(option.kind)}
						<span class="text-xs text-muted-foreground tabular-nums">{option.total}</span>
					</Button>
				{/each}
			</nav>
		{/if}
		<form method="get" class="flex flex-wrap items-center gap-2" aria-label="Filter by number">
			{#if data.status}<HiddenField name="status" value={data.status} />{/if}
			{#if data.kind}<HiddenField name="kind" value={data.kind} />{/if}
			<Input
				name="number"
				type="tel"
				inputmode="tel"
				placeholder="One number, e.g. 0912 345 678"
				value={data.number}
				class="w-64"
				aria-label="Phone number"
			/>
			<Button type="submit" variant="outline" size="sm">Filter</Button>
			{#if data.number}
				<Button href={filterHref({ number: null })} variant="ghost" size="sm">Clear</Button>
			{/if}
			{#if data.numberInvalid}
				<span class="text-sm text-destructive">Not an Ethiopian mobile number, so nothing is filtered by it.</span>
			{/if}
		</form>
	</div>

	{#if data.matching > data.limit}
		<p class="text-sm text-muted-foreground">
			Showing the newest {data.limit} of {data.matching}. Filter by status, kind or number to narrow it down.
		</p>
	{/if}

	{#key data.rows}
		<DataTable {columns} data={data.rows} fileName="SMS log" />
	{/key}
</div>
