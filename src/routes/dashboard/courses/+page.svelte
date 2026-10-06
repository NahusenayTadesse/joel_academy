<script lang="ts">
	import ListTree from '@lucide/svelte/icons/list-tree';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LookupPage from '@nahu/admin-kit/components/lookup/LookupPage.svelte';
	import {
		renderComponent,
		renderSnippet
	} from '@nahu/admin-kit/components/ui/data-table/index.js';
	import type { LookupConfig, LookupRow } from '@nahu/admin-kit/components/lookup/types';
	import { formatCurrency } from '$lib/format';
	import { resolve } from '$app/paths';
	import MediaThumb from '../MediaThumb.svelte';
	import { accessChoices, addSchema, difficultyChoices, editSchema } from './schema';

	let { data } = $props();

	type CourseRow = LookupRow & {
		name: string;
		slug: string;
		status: boolean;
		accessType: string;
		price: number;
		discountPrice: number | null;
		currency: string;
		thumbnailUrl: string | null;
		sections: number;
		lessons: number;
	};

	/*
	 * The kit previews a stored image through /dashboard/files, which cannot serve the seeded
	 * '/images/…' paths. Those rows get a blank upload field (saving keeps the stored image) and
	 * the table shows every thumbnail through `mediaUrl` instead of the kit's file cell.
	 */
	const rows = $derived(
		data.rows.map((row) => ({
			...row,
			thumbnail: row.thumbnail?.startsWith('/') ? '' : row.thumbnail
		}))
	);

	const config: LookupConfig = {
		entity: 'Course',
		plural: 'Courses',
		fields: [
			{ name: 'name', label: 'Course title', type: 'text' },
			{
				name: 'slug',
				label: 'URL slug',
				type: 'text',
				required: false,
				inTable: false,
				placeholder: 'Leave blank to build it from the title'
			},
			{ name: 'subtitle', label: 'Subtitle', type: 'text', required: false, inTable: false },
			{
				name: 'shortDescription',
				label: 'Short description (cards and search results)',
				type: 'textarea',
				rows: 3,
				required: false,
				inTable: false
			},
			{ name: 'description', label: 'Full description', type: 'textarea', rows: 8, inTable: false },
			{
				name: 'categoryId',
				label: 'Category',
				type: 'reference',
				options: 'categoryList',
				display: 'category',
				required: false
			},
			{
				name: 'instructorId',
				label: 'Instructor',
				type: 'reference',
				options: 'instructorList',
				display: 'instructor',
				required: false
			},
			{
				name: 'thumbnail',
				label: 'Thumbnail (upload to replace)',
				type: 'image',
				required: false,
				inTable: false
			},
			{
				name: 'accessType',
				label: 'Access',
				type: 'select',
				choices: accessChoices,
				inTable: false
			},
			{
				name: 'price',
				label: 'Price (paid courses)',
				type: 'money',
				required: false,
				inTable: false
			},
			{
				name: 'discountPrice',
				label: 'Discounted price (optional)',
				type: 'money',
				required: false,
				inTable: false
			},
			{ name: 'currency', label: 'Currency', type: 'text', inTable: false },
			{ name: 'difficulty', label: 'Level', type: 'select', choices: difficultyChoices },
			{
				name: 'durationMinutes',
				label: 'Duration (minutes)',
				type: 'number',
				required: false,
				inTable: false
			},
			{ name: 'language', label: 'Language', type: 'text', inTable: false },
			{
				name: 'certificateEnabled',
				label: 'Certificate',
				type: 'checkbox',
				placeholder: 'Issue a certificate on completion',
				required: false,
				inTable: false,
				trueLabel: 'Yes',
				falseLabel: 'No'
			},
			{
				name: 'featured',
				label: 'Featured',
				type: 'checkbox',
				placeholder: 'Feature on the home page',
				required: false,
				trueLabel: 'Yes',
				falseLabel: 'No'
			},
			{
				name: 'outcomes',
				label: 'What students learn (one per line)',
				type: 'textarea',
				rows: 5,
				required: false,
				inTable: false
			},
			{
				name: 'requirements',
				label: 'Requirements (one per line)',
				type: 'textarea',
				rows: 4,
				required: false,
				inTable: false
			},
			{
				name: 'tags',
				label: 'Tags (one per line)',
				type: 'textarea',
				rows: 3,
				required: false,
				inTable: false
			},
			{
				name: 'status',
				label: 'Status',
				type: 'boolean',
				trueLabel: 'Published',
				falseLabel: 'Draft'
			},
			{ name: 'sortOrder', label: 'Order', type: 'number' }
		],
		extraColumns: [
			{
				id: 'thumbnailPreview',
				header: 'Thumbnail',
				enableSorting: false,
				cell: ({ row }) =>
					renderComponent(MediaThumb, {
						url: (row.original as CourseRow).thumbnailUrl,
						alt: String(row.original.name)
					})
			},
			{
				id: 'priceLabel',
				header: 'Price',
				accessorFn: (row) => Number(row.price),
				cell: ({ row }) => renderSnippet(priceCell, row.original as CourseRow)
			},
			{
				id: 'curriculum',
				header: 'Curriculum',
				enableSorting: false,
				cell: ({ row }) => renderSnippet(curriculumCell, row.original as CourseRow)
			}
		]
	};
</script>

{#snippet priceCell(row: CourseRow)}
	{#if row.accessType === 'FREE'}
		<span class="text-emerald-600">Free</span>
	{:else if row.discountPrice !== null}
		<span class="whitespace-nowrap">
			{formatCurrency(row.discountPrice, row.currency)}
			<s class="text-xs text-muted-foreground">{formatCurrency(row.price, row.currency)}</s>
		</span>
	{:else}
		<span class="whitespace-nowrap">{formatCurrency(row.price, row.currency)}</span>
	{/if}
{/snippet}

{#snippet curriculumCell(row: CourseRow)}
	<div class="flex items-center gap-3 whitespace-nowrap">
		<a
			href={resolve('/dashboard/courses/[id]', { id: String(row.id) })}
			class="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
		>
			<ListTree class="size-4" />
			{row.sections} sections · {row.lessons} lessons
		</a>
		{#if row.status}
			<a
				href={resolve('/(public)/courses/[slug]', { slug: row.slug })}
				target="_blank"
				rel="noopener"
				title="View on the site"
				class="text-muted-foreground hover:text-foreground"
			>
				<ExternalLink class="size-4" />
				<span class="sr-only">View on the site</span>
			</a>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	<PageHeader
		title="Courses"
		description="Create and price your catalog, then open a course's curriculum to add sections and lessons. Only published courses appear on the site."
	/>
	<LookupPage
		data={{ ...data, rows }}
		tabTitle={false}
		schemas={{ add: addSchema, edit: editSchema }}
		{config}
	/>
</div>
