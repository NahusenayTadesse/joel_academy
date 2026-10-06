<script lang="ts">
	import Trash from '@lucide/svelte/icons/trash';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { dateTime } from '../format';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const columns: ColumnDef<Row>[] = [
		{ id: 'index', header: '#', enableSorting: false, cell: ({ row }) => row.index + 1 },
		{ id: 'email', accessorKey: 'email', header: 'Email' },
		{
			id: 'createdAt',
			// A plain string, so the export carries a readable date rather than an object.
			accessorFn: (row) => dateTime(row.createdAt),
			header: 'Subscribed',
			sortingFn: (a, b) =>
				new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime()
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(actionsCell, row.original)
		}
	];
</script>

{#snippet actionsCell(row: Row)}
	<div class="flex justify-end">
		<ConfirmAction
			action="?/delete"
			label="Remove"
			variant="ghost"
			icon={Trash}
			title="Remove {row.email}?"
			description="They stop receiving the newsletter. They can subscribe again from the site."
			fields={{ id: row.id }}
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Subscribers"
		description="{data.rows
			.length} people signed up for the newsletter from the site footer. Use the download button above the table to export the list."
	/>

	{#key data.rows}
		<DataTable {columns} data={data.rows} fileName="Newsletter subscribers" />
	{/key}
</div>
