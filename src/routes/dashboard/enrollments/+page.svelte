<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
	import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge, type BadgeVariant } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { fileUrl } from '@nahu/admin-kit/files';
	import { formatCurrency } from '$lib/format';
	import { localPhone } from '$lib/phone';
	import { dateTime, shortDate } from '../format';
	import { enrollSchema, rejectSchema } from './schema';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	const STATUS_LABELS = { PENDING: 'Pending', ACTIVE: 'Active', REJECTED: 'Rejected' } as const;
	/** How the place was paid for; the badge says the stored value, the tooltip what it means. */
	const PROVIDERS = {
		FREE: { variant: 'outline', hint: 'Nothing to pay (free course, full promo or enrolled by staff)' },
		MANUAL: { variant: 'secondary', hint: 'Bank transfer, receipt reviewed by staff' },
		CHAPA: { variant: 'default', hint: 'Paid online through Chapa (no longer offered)' }
	} as const satisfies Record<Row['paymentProvider'], { variant: BadgeVariant; hint: string }>;

	/** "SAVE20 (−Br50.00)", or '' when no code was used. */
	function promoText(code: string | null, discount: number, currency: string) {
		if (!code) return '';
		return discount > 0 ? `${code} (−${formatCurrency(discount, currency)})` : code;
	}

	const total = $derived(data.counts.PENDING + data.counts.ACTIVE + data.counts.REJECTED);
	const tabs = $derived([
		{ key: null, label: 'All', count: total },
		{ key: 'PENDING', label: 'Pending review', count: data.counts.PENDING },
		{ key: 'ACTIVE', label: 'Active', count: data.counts.ACTIVE },
		{ key: 'REJECTED', label: 'Rejected', count: data.counts.REJECTED }
	]);

	let rejectOpen = $state(false);
	let rejectSeed = $state<{ id: number; reason: string }>();
	let rejectWho = $state('');

	function openReject(row: Row) {
		rejectSeed = { id: row.id, reason: '' };
		rejectWho = `${row.studentName} · ${row.course}`;
		rejectOpen = true;
	}

	/*
	 * Plain values for the toolbar's search and facets: the table searches what the columns read,
	 * so the student column carries the email and phone too.
	 */
	const rows = $derived(
		data.rows.map((row) => ({
			...row,
			student: [row.studentName, row.studentEmail, row.studentPhone ? localPhone(row.studentPhone) : '']
				.join(' ')
				.trim()
		}))
	);

	const columns: ColumnDef<Row & { student: string }>[] = [
		{
			id: 'student',
			accessorKey: 'student',
			header: 'Student',
			cell: ({ row }) => renderSnippet(studentCell, row.original)
		},
		{ id: 'course', accessorKey: 'course', header: 'Course' },
		{
			id: 'status',
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderSnippet(statusCell, row.original)
		},
		{
			id: 'amount',
			accessorKey: 'amount',
			header: 'Amount',
			meta: { align: 'right' },
			cell: ({ row }) =>
				row.original.amount > 0
					? formatCurrency(row.original.amount, row.original.currency)
					: 'Free'
		},
		{
			id: 'provider',
			accessorKey: 'paymentProvider',
			header: 'Provider',
			cell: ({ row }) => renderSnippet(providerCell, row.original)
		},
		{
			id: 'promo',
			accessorFn: (row) => promoText(row.promoCode, row.discountAmount, row.currency),
			header: 'Promo'
		},
		{ id: 'method', accessorFn: (row) => row.method ?? '', header: 'Paid via' },
		{ id: 'reference', accessorFn: (row) => row.reference ?? '', header: 'Reference' },
		{
			id: 'receipt',
			header: 'Receipt',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(receiptCell, row.original)
		},
		{
			id: 'createdAt',
			accessorFn: (row) => new Date(row.createdAt).getTime(),
			header: 'Submitted',
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{
			id: 'review',
			header: 'Review',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(reviewCell, row.original)
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(actionsCell, row.original)
		}
	];

</script>

{#snippet studentCell(row: Row)}
	<div class="flex flex-col">
		<span class="font-medium">{row.studentName}</span>
		<a href="mailto:{row.studentEmail}" class="text-xs text-muted-foreground hover:underline"
			>{row.studentEmail}</a
		>
		{#if row.studentPhone}
			<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
				<a href="tel:+{row.studentPhone}" class="tabular-nums hover:underline">{localPhone(row.studentPhone)}</a>
				{#if row.studentPhoneVerified}
					<Badge variant="secondary" class="px-1.5 py-0 text-[10px]">Verified</Badge>
				{:else}
					<Badge variant="outline" class="px-1.5 py-0 text-[10px]">Unverified</Badge>
				{/if}
			</span>
		{/if}
	</div>
{/snippet}

{#snippet statusCell(row: Row)}
	<Statuses status={row.status} label={STATUS_LABELS[row.status]} />
	{#if row.completedAt}<p class="mt-1 text-xs text-emerald-700">Completed</p>{/if}
{/snippet}

{#snippet providerCell(row: Row)}
	{@const provider = PROVIDERS[row.paymentProvider]}
	<Badge variant={provider.variant} title={provider.hint}>{row.paymentProvider}</Badge>
{/snippet}

{#snippet receiptCell(row: Row)}
	{#if row.receipt}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a stored file, not a page -->
		<a
			href={fileUrl(row.receipt)}
			target="_blank"
			rel="noopener"
			class="inline-flex items-center gap-1 text-sm text-primary-ink hover:underline"
		>
			<FileText class="size-4" /> View
		</a>
	{:else}
		<span class="text-xs text-muted-foreground">—</span>
	{/if}
{/snippet}

{#snippet reviewCell(row: Row)}
	{#if row.reviewedAt}
		<div class="flex flex-col text-xs">
			<span>{row.reviewer ?? 'Staff'} · {shortDate(row.reviewedAt)}</span>
			{#if row.status === 'REJECTED' && row.rejectionReason}
				<span class="text-destructive"><BigText text={row.rejectionReason} max={40} /></span>
			{/if}
		</div>
	{:else}
		<span class="text-xs text-muted-foreground">—</span>
	{/if}
{/snippet}

{#snippet actionsCell(row: Row)}
	<div class="flex items-center justify-end gap-1">
		{#if row.paymentProvider === 'MANUAL' && row.status !== 'ACTIVE'}
			<ConfirmAction
				action="?/approve"
				label={row.status === 'REJECTED' ? 'Approve anyway' : 'Approve'}
				variant="outline"
				icon={Check}
				title="Approve {row.studentName}'s enrolment?"
				description="{row.studentName} gets full access to {row.course} straight away.{row.amount >
				0
					? ` Check the receipt shows ${formatCurrency(row.amount, row.currency)} first.`
					: ''}"
				fields={{ id: row.id }}
			/>
		{/if}
		{#if row.paymentProvider === 'MANUAL' && row.status === 'PENDING'}
			<Button variant="ghost" size="sm" class="text-destructive" onclick={() => openReject(row)}>
				<X class="size-4" /> Reject
			</Button>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Enrollments"
		description="Review payment receipts for paid courses, and enrol students by hand."
	>
		{#snippet actions()}
			<FormDialog
				title="Enrol a student"
				description="Gives an existing account full access to a course, with no payment through the site."
				triggerLabel="Enrol a student"
				submitLabel="Enrol"
				action="?/enroll"
				data={data.enrollForm}
				schema={enrollSchema}
				resetOnSuccess
			>
				{#snippet fields({ form, errors })}
					<InputComp
						{form}
						{errors}
						name="email"
						label="Student's email"
						type="email"
						placeholder="student@example.com"
						required
					/>
					<InputComp
						{form}
						{errors}
						name="courseId"
						label="Course"
						type="combo"
						items={data.courses}
						required
					/>
				{/snippet}
			</FormDialog>
		{/snippet}
	</PageHeader>

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

	{#if data.counts.PENDING && data.status !== 'PENDING'}
		<Notice tone="warning" title="{data.counts.PENDING} payment(s) waiting for review. ">
			Students cannot start a paid course until you approve their receipt.
			{#snippet actions()}
				<Button href="?status=PENDING" size="sm" variant="outline">Review now</Button>
			{/snippet}
		</Notice>
	{/if}

	{#key data.rows}
		<DataTable
			{columns}
			data={rows}
			fileName="Enrollments"
			facetKeys={['course', 'provider', 'method']}
			facetLabels={{ course: 'Course', provider: 'Provider', method: 'Paid via' }}
		/>
	{/key}

</div>

<FormDialog
	title="Reject this payment?"
	description={rejectWho}
	action="?/reject"
	submitLabel="Reject"
	data={data.rejectForm}
	schema={rejectSchema}
	bind:open={rejectOpen}
	seed={rejectSeed}
	hideTrigger
	resetOnSuccess
>
	{#snippet fields({ form, errors, values })}
		<HiddenField name="id" value={values.id} />
		<InputComp
			{form}
			{errors}
			name="reason"
			label="Reason (shown to the student)"
			type="textarea"
			rows={4}
			placeholder="The receipt shows 300 ETB; the course costs 350 ETB. Please upload the full payment."
			required
		/>
	{/snippet}
</FormDialog>
