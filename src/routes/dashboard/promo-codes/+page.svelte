<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import LookupPage from '@nahu/admin-kit/components/lookup/LookupPage.svelte';
	import type { LookupConfig, LookupRow } from '@nahu/admin-kit/components/lookup/types';
	import { formatCurrency } from '$lib/format';
	import { addSchema, discountTypeChoices, editSchema } from './schema';

	let { data } = $props();

	type PromoRow = LookupRow & {
		code: string;
		discountType: 'PERCENT' | 'FIXED';
		discountValue: number;
		course: string | null;
		maxRedemptions: number | null;
		startsAt: string;
		endsAt: string;
		redeemed: number;
		state: string;
	};

	const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });
	const showDay = (value: string) => day.format(new Date(`${value}T00:00:00Z`));

	function validity(row: PromoRow): string {
		if (row.startsAt && row.endsAt) return `${showDay(row.startsAt)} – ${showDay(row.endsAt)}`;
		if (row.startsAt) return `From ${showDay(row.startsAt)}`;
		if (row.endsAt) return `Until ${showDay(row.endsAt)}`;
		return 'Always';
	}

	const config: LookupConfig = {
		entity: 'Promo code',
		plural: 'Promo codes',
		fields: [
			{ name: 'code', label: 'Code', type: 'text', placeholder: 'WELCOME15' },
			{
				name: 'description',
				label: 'Description (shown to the student)',
				type: 'text',
				required: false,
				long: 24
			},
			{ name: 'discountType', label: 'Discount type', type: 'select', choices: discountTypeChoices, inTable: false },
			{
				name: 'discountValue',
				label: 'Discount (% or amount in the course currency)',
				type: 'number',
				inTable: false
			},
			{
				name: 'courseId',
				label: 'Course (leave empty for every paid course)',
				type: 'reference',
				options: 'courseList',
				display: 'course',
				required: false,
				inTable: false
			},
			{
				name: 'maxRedemptions',
				label: 'Max redemptions (empty for unlimited)',
				type: 'number',
				required: false,
				inTable: false
			},
			{ name: 'startsAt', label: 'Starts (optional)', type: 'date', required: false, inTable: false },
			{ name: 'endsAt', label: 'Ends (optional, last day it works)', type: 'date', required: false, inTable: false },
			// Shown in the table as part of State (Off, Scheduled, Expired, Used up, Live).
			{ name: 'status', label: 'Status', type: 'boolean', inTable: false }
		],
		extraColumns: [
			{
				id: 'discount',
				header: 'Discount',
				accessorFn: (row) => Number(row.discountValue),
				cell: ({ row }) => {
					const promo = row.original as PromoRow;
					return promo.discountType === 'PERCENT'
						? `${promo.discountValue}%`
						: formatCurrency(promo.discountValue);
				}
			},
			{
				id: 'appliesTo',
				header: 'Applies to',
				accessorFn: (row) => (row as PromoRow).course ?? 'All paid courses',
				meta: { class: 'max-w-56 truncate' }
			},
			{
				id: 'validity',
				header: 'Valid',
				enableSorting: false,
				cell: ({ row }) => validity(row.original as PromoRow)
			},
			{
				id: 'redeemed',
				header: 'Redeemed',
				accessorFn: (row) => (row as PromoRow).redeemed,
				cell: ({ row }) => {
					const promo = row.original as PromoRow;
					return promo.maxRedemptions === null ? String(promo.redeemed) : `${promo.redeemed} / ${promo.maxRedemptions}`;
				}
			},
			{
				id: 'state',
				header: 'State',
				accessorFn: (row) => (row as PromoRow).state,
			}
		]
	};
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Promo codes"
		description="Discount codes students enter at checkout. Redeemed counts students who used the code on a course (paid, under review, or an online payment started in the last hour)."
	/>
	<LookupPage {data} tabTitle={false} schemas={{ add: addSchema, edit: editSchema }} {config} />
</div>
