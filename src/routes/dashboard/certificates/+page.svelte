<script lang="ts">
	import Ban from '@lucide/svelte/icons/ban';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { resolve } from '$app/paths';
	import { shortDate } from '../format';
	import { issueSchema, revokeSchema } from './schema';

	let { data } = $props();

	type Row = (typeof data.rows)[number] & { state: string };

	const rows = $derived(
		data.rows.map((row) => ({ ...row, state: row.revokedAt ? 'Revoked' : 'Valid' }))
	);
	const revokedCount = $derived(rows.filter((row) => row.revokedAt).length);

	let revokeOpen = $state(false);
	let revokeSeed = $state<{ id: number; reason: string }>();
	let revokeWho = $state('');

	function openRevoke(row: Row) {
		revokeSeed = { id: row.id, reason: '' };
		revokeWho = `${row.code} · ${row.recipientName} · ${row.courseTitle}`;
		revokeOpen = true;
	}

	const columns: ColumnDef<Row>[] = [
		{
			id: 'code',
			accessorKey: 'code',
			header: 'Code',
			cell: ({ row }) => renderSnippet(codeCell, row.original)
		},
		{
			id: 'recipientName',
			accessorKey: 'recipientName',
			header: 'Recipient',
			cell: ({ row }) => renderSnippet(recipientCell, row.original)
		},
		{ id: 'courseTitle', accessorKey: 'courseTitle', header: 'Course' },
		{
			id: 'issuedAt',
			accessorFn: (row) => new Date(row.issuedAt).getTime(),
			header: 'Issued',
			cell: ({ row }) => shortDate(row.original.issuedAt)
		},
		{
			id: 'state',
			accessorKey: 'state',
			header: 'Status',
			cell: ({ row }) => renderSnippet(stateCell, row.original)
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(actionsCell, row.original)
		}
	];
</script>

{#snippet codeCell(row: Row)}
	<a
		href={resolve('/(public)/certificates/verify/[token]', { token: row.code })}
		target="_blank"
		rel="noopener"
		class="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
		title="Open the public verification page"
	>
		{row.code}
		<ExternalLink class="size-3" />
	</a>
{/snippet}

{#snippet recipientCell(row: Row)}
	<div class="flex flex-col">
		<span>{row.recipientName}</span>
		{#if row.email}<span class="text-xs text-muted-foreground">{row.email}</span>{/if}
	</div>
{/snippet}

{#snippet stateCell(row: Row)}
	{#if row.revokedAt}
		<div class="flex flex-col gap-1">
			<Statuses status="rejected" label="Revoked {shortDate(row.revokedAt)}" />
			{#if row.revokedReason}
				<span class="text-xs text-muted-foreground"
					><BigText text={row.revokedReason} max={40} /></span
				>
			{/if}
		</div>
	{:else}
		<Statuses status="active" label="Valid" />
	{/if}
{/snippet}

{#snippet actionsCell(row: Row)}
	<div class="flex justify-end">
		{#if row.revokedAt}
			<ConfirmAction
				action="?/restore"
				label="Restore"
				variant="outline"
				icon={RotateCcw}
				title="Restore {row.code}?"
				description="It verifies as valid again for anyone who checks it."
				fields={{ id: row.id }}
			/>
		{:else}
			<Button variant="ghost" size="sm" class="text-destructive" onclick={() => openRevoke(row)}>
				<Ban class="size-4" /> Revoke
			</Button>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Certificates"
		description="Issued automatically when a student completes a course. Revoke one issued in error; anyone verifying it then sees it as revoked."
	>
		{#snippet actions()}
			<FormDialog
				title="Issue a certificate"
				description="For an active enrolment that has none yet — a student who finished offline, say."
				triggerLabel="Issue a certificate"
				submitLabel="Issue"
				action="?/issue"
				data={data.issueForm}
				schema={issueSchema}
				resetOnSuccess
			>
				{#snippet fields({ form, errors })}
					<InputComp
						{form}
						{errors}
						name="enrollmentId"
						label="Student and course"
						type="combo"
						items={data.candidates}
						required
					/>
				{/snippet}
			</FormDialog>
		{/snippet}
	</PageHeader>

	<p class="text-sm text-muted-foreground">
		{rows.length} issued · {revokedCount} revoked
	</p>

	{#key data.rows}
		<DataTable
			{columns}
			data={rows}
			fileName="Certificates"
			facetKeys={['courseTitle', 'state']}
			facetLabels={{ courseTitle: 'Course', state: 'Status' }}
		/>
	{/key}
</div>

<FormDialog
	title="Revoke this certificate?"
	description={revokeWho}
	action="?/revoke"
	submitLabel="Revoke"
	data={data.revokeForm}
	schema={revokeSchema}
	bind:open={revokeOpen}
	seed={revokeSeed}
	hideTrigger
	resetOnSuccess
>
	{#snippet fields({ form, errors, values })}
		<input type="hidden" name="id" value={values.id} />
		<InputComp
			{form}
			{errors}
			name="reason"
			label="Reason (kept on record)"
			type="textarea"
			rows={3}
			placeholder="Issued to the wrong account."
			required
		/>
	{/snippet}
</FormDialog>
