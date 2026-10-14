<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import Send from '@lucide/svelte/icons/send';
	import { enhance } from '$app/forms';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { Label } from '@nahu/admin-kit/components/ui/label/index.js';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { dateTime } from '../format';
	import { kindLabel } from './preview';

	let { data, form } = $props();
	let sending = $state(false);

	type Row = (typeof data.rows)[number];

	const STATUS = {
		SENT: { badge: 'success', label: 'Sent' },
		SKIPPED: { badge: 'skipped', label: 'Skipped' },
		FAILED: { badge: 'failed', label: 'Failed' }
	} as const;

	/** A filter link that keeps the other filter. */
	function filterHref(changes: { status?: string | null; kind?: string | null }) {
		const params = new URLSearchParams();
		const status = 'status' in changes ? changes.status : data.status;
		const kind = 'kind' in changes ? changes.kind : data.kind;
		if (status) params.set('status', status);
		if (kind) params.set('kind', kind);
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

	let previewOpen = $state(false);
	let previewRow = $state<Row>();
	let preview = $state<{ document: string; links: string[] }>();
	let previewError = $state('');

	/* Loaded on demand: the list carries no HTML. A later click wins over a slower earlier one. */
	async function openPreview(row: Row) {
		previewRow = row;
		preview = undefined;
		previewError = '';
		previewOpen = true;
		try {
			const response = await fetch(`/dashboard/emails/${row.id}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const body = await response.json();
			if (previewRow?.id === row.id) preview = body;
		} catch {
			if (previewRow?.id === row.id) previewError = 'Could not load this email.';
		}
	}

	const columns: ColumnDef<Row>[] = [
		{
			id: 'createdAt',
			accessorFn: (row) => new Date(row.createdAt).getTime(),
			header: 'Date',
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{ id: 'to', accessorKey: 'to', header: 'To' },
		{ id: 'kind', accessorFn: (row) => kindLabel(row.kind), header: 'Kind' },
		{
			id: 'subject',
			accessorKey: 'subject',
			header: 'Subject',
			cell: ({ row }) => renderSnippet(subjectCell, row.original)
		},
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
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(actionsCell, row.original)
		}
	];
</script>

{#snippet subjectCell(row: Row)}
	<BigText text={row.subject} max={50} />
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

{#snippet actionsCell(row: Row)}
	<div class="flex justify-end">
		<Button variant="ghost" size="sm" onclick={() => openPreview(row)}>
			<Eye class="size-4" /> Preview
		</Button>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Email log"
		description="Every email the academy tried to send: account links, enrollment and payment updates, certificates and staff notifications."
	/>

	{#if !data.smtpConfigured}
		<Notice tone="info" title="Emails are not being delivered.">
			No mail server is set up (SMTP_HOST), so emails are kept here as Skipped instead of being sent.
			Open one to read it and follow its links.
		</Notice>
	{/if}

	<PageSection
		title="Send a test email"
		hint="Check the mail server settings with one real email. Limited to a few per address per hour."
	>
		<Card.Root>
			<Card.Content class="pt-6">
				<form
					method="post"
					action="?/test"
					class="grid gap-4 md:grid-cols-[minmax(0,24rem)_auto] md:items-end"
					use:enhance={() => {
						sending = true;
						return async ({ update }) => {
							await update({ reset: false });
							sending = false;
						};
					}}
				>
					<div class="flex flex-col gap-2">
						<Label for="test-to">Send to</Label>
						<Input id="test-to" name="to" type="email" placeholder="you@example.com" value={form?.to ?? ''} required />
					</div>
					<Button type="submit" disabled={sending}>
						<Send class="size-4" />
						{sending ? 'Sending…' : 'Send test'}
					</Button>
				</form>
				<p class="mt-3 text-xs text-muted-foreground">
					{data.sender ? `Sent from ${data.sender}.` : 'No sender address is set (MAIL_FROM or SMTP_USER).'}
				</p>
				{#if form?.error}
					<Notice tone="danger" class="mt-4">{form.error}</Notice>
				{:else if form?.status === 'SENT'}
					<Notice tone="success" class="mt-4">The mail server accepted the email. Check the inbox (and the spam folder).</Notice>
				{:else if form?.status === 'FAILED'}
					<Notice tone="danger" title="The mail server refused the email." class="mt-4">{form.sendError}</Notice>
				{:else if form?.status === 'SKIPPED'}
					<Notice tone="info" class="mt-4">Logged as Skipped: no SMTP_HOST is set, so nothing was sent.</Notice>
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
	</div>

	{#if data.matching > data.limit}
		<p class="text-sm text-muted-foreground">
			Showing the newest {data.limit} of {data.matching}. Filter by status or kind to narrow it down.
		</p>
	{/if}

	{#key data.rows}
		<DataTable {columns} data={data.rows} fileName="Email log" />
	{/key}
</div>

<Dialog.Root bind:open={previewOpen}>
	<Dialog.Content class="sm:max-w-3xl">
		{#if previewRow}
			<Dialog.Header>
				<Dialog.Title class="pr-6">{previewRow.subject}</Dialog.Title>
				<Dialog.Description>
					To {previewRow.to} · {dateTime(previewRow.createdAt)} · {kindLabel(previewRow.kind)} ·
					{STATUS[previewRow.status].label}
				</Dialog.Description>
			</Dialog.Header>
			{#if previewRow.error}
				<p class="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{previewRow.error}</p>
			{/if}
			{#if preview}
				<!-- No allow-scripts and no allow-same-origin: the email runs no code and reaches nothing of the dashboard. -->
				<iframe
					title="Preview of {previewRow.subject}"
					sandbox="allow-popups allow-popups-to-escape-sandbox"
					referrerpolicy="no-referrer"
					srcdoc={preview.document}
					class="h-[55vh] w-full rounded-md border bg-white"
				></iframe>
				{#if preview.links.length}
					<div class="flex flex-col gap-1 text-sm">
						<p class="font-medium">Links in this email</p>
						<ul class="flex flex-col gap-1">
							{#each preview.links as link (link)}
								<li>
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a link from the email itself -->
									<a
										href={link}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-start gap-1 break-all text-primary-ink hover:underline"
									>
										<ExternalLink class="mt-0.5 size-3 shrink-0" />{link}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{:else if previewError}
				<p class="text-sm text-destructive">{previewError}</p>
			{:else}
				<p class="text-sm text-muted-foreground">Loading…</p>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
