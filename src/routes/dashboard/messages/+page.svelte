<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import Reply from '@lucide/svelte/icons/reply';
	import Trash from '@lucide/svelte/icons/trash';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import DialogComp from '@nahu/admin-kit/formComponents/DialogComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { dateTime } from '../format';
	import MarkButton from './MarkButton.svelte';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const tabs = $derived([
		{ key: null, label: 'All', count: data.counts.NEW + data.counts.READ },
		{ key: 'NEW', label: 'New', count: data.counts.NEW },
		{ key: 'READ', label: 'Read', count: data.counts.READ }
	]);

	const replyLink = (row: Row) =>
		`mailto:${row.email}?subject=${encodeURIComponent('Re: your message to Joel Talargie Academy')}`;

	const columns: ColumnDef<Row>[] = [
		{
			id: 'name',
			accessorFn: (row) => `${row.name} ${row.email}`,
			header: 'From',
			cell: ({ row }) => renderSnippet(fromCell, row.original)
		},
		{
			id: 'message',
			accessorKey: 'message',
			header: 'Message',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(messageCell, row.original)
		},
		{
			id: 'createdAt',
			accessorFn: (row) => new Date(row.createdAt).getTime(),
			header: 'Received',
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderSnippet(statusCell, row.original)
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(actionsCell, row.original)
		}
	];
</script>

{#snippet fromCell(row: Row)}
	<div class="flex flex-col">
		<span class={row.status === 'NEW' ? 'font-semibold' : ''}>{row.name}</span>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a mailto link -->
		<a href={replyLink(row)} class="text-xs text-muted-foreground hover:underline">{row.email}</a>
	</div>
{/snippet}

{#snippet messageCell(row: Row)}
	<BigText text={row.message} max={70} />
{/snippet}

{#snippet statusCell(row: Row)}
	<Statuses
		status={row.status === 'NEW' ? 'new' : 'closed'}
		label={row.status === 'NEW' ? 'New' : 'Read'}
	/>
{/snippet}

{#snippet actionsCell(row: Row)}
	<div class="flex items-center justify-end gap-1">
		<DialogComp title="Message from {row.name}" variant="ghost">
			{#snippet trigger(props)}
				<Button variant="ghost" size="sm" {...props}><Eye class="size-4" /> View</Button>
			{/snippet}
			<div class="flex flex-col gap-4 p-1">
				<p class="text-sm text-muted-foreground">
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a mailto link -->
					<a href={replyLink(row)} class="hover:underline">{row.email}</a> · {dateTime(
						row.createdAt
					)}
				</p>
				<p class="text-sm leading-relaxed whitespace-pre-wrap">{row.message}</p>
				<div class="flex flex-wrap gap-2">
					<Button href={replyLink(row)} size="sm"><Reply class="size-4" /> Reply by email</Button>
					<MarkButton id={row.id} status={row.status} />
				</div>
			</div>
		</DialogComp>
		<MarkButton id={row.id} status={row.status} />
		<ConfirmAction
			action="?/delete"
			label="Delete"
			variant="ghost"
			icon={Trash}
			title="Delete the message from {row.name}?"
			description="It is removed for good."
			fields={{ id: row.id }}
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Messages"
		description="What visitors sent through the contact form. Reply by email, then mark them read."
	/>

	<nav class="flex flex-wrap gap-2" aria-label="Filter by status">
		{#each tabs as tab (tab.label)}
			<Button
				href={tab.key ? `?status=${tab.key}` : '?'}
				variant={data.status === tab.key ? 'default' : 'outline'}
				size="sm"
				aria-current={data.status === tab.key ? 'page' : undefined}
			>
				{tab.label}
				<span class="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">{tab.count}</span>
			</Button>
		{/each}
	</nav>

	{#key data.rows}
		<DataTable {columns} data={data.rows} fileName="Messages" />
	{/key}
</div>
