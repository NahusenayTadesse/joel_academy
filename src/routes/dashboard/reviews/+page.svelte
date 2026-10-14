<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Star from '@lucide/svelte/icons/star';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import { ROUTES } from '$lib/site';
	import { dateTime } from '../format';

	let { data } = $props();

	const STATUS_LABELS = { PUBLISHED: 'Published', HIDDEN: 'Hidden' } as const;

	/*
	 * Plain values for the toolbar's facets, which filter on a row's own property named like the
	 * column: course, rating ("4 stars") and status.
	 */
	const rows = $derived(
		data.rows.map((row) => ({
			...row,
			student: `${row.studentName} ${row.studentEmail}`,
			stars: `${row.rating} star${row.rating === 1 ? '' : 's'}`,
			state: STATUS_LABELS[row.status]
		}))
	);
	type Row = (typeof rows)[number];
	type Average = (typeof data.averages)[number];

	const publishedTotal = $derived(data.averages.reduce((sum, row) => sum + row.published, 0));
	const hiddenTotal = $derived(data.averages.reduce((sum, row) => sum + row.hidden, 0));

	const columns: ColumnDef<Row>[] = [
		{
			id: 'course',
			accessorKey: 'course',
			header: 'Course',
			cell: ({ row }) => renderSnippet(courseCell, row.original)
		},
		{
			id: 'student',
			accessorKey: 'student',
			header: 'Student',
			cell: ({ row }) => renderSnippet(studentCell, row.original)
		},
		{
			id: 'stars',
			accessorKey: 'stars',
			header: 'Rating',
			cell: ({ row }) => renderSnippet(ratingCell, row.original)
		},
		{
			id: 'comment',
			accessorFn: (row) => row.comment ?? '',
			header: 'Comment',
			enableSorting: false,
			cell: ({ row }) => renderSnippet(commentCell, row.original)
		},
		{
			id: 'createdAt',
			accessorFn: (row) => new Date(row.createdAt).getTime(),
			header: 'Date',
			cell: ({ row }) => dateTime(row.original.createdAt)
		},
		{
			id: 'state',
			accessorKey: 'state',
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

	const averageColumns: ColumnDef<Average>[] = [
		{ id: 'course', accessorKey: 'course', header: 'Course' },
		{
			id: 'average',
			accessorFn: (row) => row.average ?? 0,
			header: 'Public average',
			meta: { align: 'right' },
			cell: ({ row }) => renderSnippet(averageCell, row.original)
		},
		{ id: 'published', accessorKey: 'published', header: 'Published', meta: { align: 'right' } },
		{ id: 'hidden', accessorKey: 'hidden', header: 'Hidden', meta: { align: 'right' } }
	];
</script>

{#snippet courseCell(row: Row)}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a public page, opened beside the dashboard -->
	<a href="{ROUTES.courses.detail(row.courseSlug)}#reviews" target="_blank" rel="noopener" class="hover:underline"
		>{row.course}</a
	>
{/snippet}

{#snippet studentCell(row: Row)}
	<div class="flex flex-col">
		<span class="font-medium">{row.studentName}</span>
		<a href="mailto:{row.studentEmail}" class="text-xs text-muted-foreground hover:underline">{row.studentEmail}</a>
	</div>
{/snippet}

{#snippet ratingCell(row: Row)}
	<span class="inline-flex items-center gap-0.5" role="img" aria-label="{row.rating} out of 5 stars">
		{#each { length: 5 }, index (index)}
			<Star
				aria-hidden="true"
				class="size-3.5 {index < row.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}"
			/>
		{/each}
	</span>
{/snippet}

{#snippet commentCell(row: Row)}
	{#if row.comment}
		<BigText text={row.comment} max={60} />
	{:else}
		<span class="text-xs text-muted-foreground">—</span>
	{/if}
{/snippet}

{#snippet statusCell(row: Row)}
	<Badge variant={row.status === 'PUBLISHED' ? 'secondary' : 'outline'}>{row.state}</Badge>
{/snippet}

{#snippet averageCell(row: Average)}
	{#if row.average === null}
		<span class="text-muted-foreground">—</span>
	{:else}
		<span class="inline-flex items-center gap-1 tabular-nums">
			<Star class="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
			{row.average.toFixed(1)}
		</span>
	{/if}
{/snippet}

{#snippet actionsCell(row: Row)}
	<div class="flex items-center justify-end gap-1">
		{#if row.status === 'PUBLISHED'}
			<ConfirmAction
				action="?/status"
				label="Hide"
				variant="outline"
				icon={EyeOff}
				title="Hide {row.studentName}'s review?"
				description="It disappears from the course page and no longer counts towards {row.course}'s average. The student still sees it, marked as hidden."
				fields={{ id: row.id, status: 'HIDDEN' }}
			/>
		{:else}
			<ConfirmAction
				action="?/status"
				label="Unhide"
				variant="outline"
				icon={Eye}
				title="Publish {row.studentName}'s review again?"
				description="It shows on the course page and counts towards {row.course}'s average again."
				fields={{ id: row.id, status: 'PUBLISHED' }}
			/>
		{/if}
		<ConfirmAction
			action="?/delete"
			label="Delete"
			variant="ghost"
			icon={Trash2}
			title="Delete {row.studentName}'s review?"
			description="The review is removed for good; the student may write a new one. Hiding keeps it instead."
			fields={{ id: row.id }}
		/>
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Reviews"
		description="Ratings and comments students leave on courses. Hidden reviews are kept but left out of the public page and the average."
	/>

	{#key data.rows}
		<DataTable
			{columns}
			data={rows}
			fileName="Course reviews"
			facetKeys={['course', 'stars', 'state']}
			facetLabels={{ course: 'Course', stars: 'Rating', state: 'Status' }}
			rowClass={(row) => (row.status === 'HIDDEN' ? 'opacity-70' : null)}
		/>
	{/key}

	<PageSection
		title="Average per course"
		hint="{publishedTotal} published and {hiddenTotal} hidden review(s). The public average counts published reviews only."
	>
		{#key data.averages}
			<DataTable columns={averageColumns} data={data.averages} variant="compact" fileName="Course ratings" />
		{/key}
	</PageSection>
</div>
