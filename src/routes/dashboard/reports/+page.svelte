<script lang="ts">
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import type { ColumnDef } from '@tanstack/table-core';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import PageSection from '@nahu/admin-kit/components/PageSection.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import StatCard from '@nahu/admin-kit/components/reports/StatCard.svelte';
	import ReportChart from '@nahu/admin-kit/components/reports/ReportChart.svelte';
	import type { ReportChartData, Stat } from '@nahu/admin-kit/components/reports/types';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import { formatCurrency } from '$lib/format';
	import type { CourseRow, PaymentRow, PromoRow } from '$lib/server/reports';

	let { data } = $props();

	const report = $derived(data.report);
	const k = $derived(data.report.kpis);

	const PRESETS = [
		{ key: '7d', label: 'Last 7 days' },
		{ key: '30d', label: 'Last 30 days' },
		{ key: '90d', label: 'Last 90 days' },
		{ key: 'year', label: 'This year' }
	] as const;
	const PROVIDER_NAMES = { MANUAL: 'Manual (receipt)', CHAPA: 'Chapa', FREE: 'Free' } as const;

	let customOpen = $state(false);
	const showCustom = $derived(customOpen || data.range.preset === 'custom');

	const dayName = (day: string) =>
		new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});
	const rangeLabel = $derived(
		`${dayName(data.range.fromDay)} – ${dayName(data.range.toDay)} · ${data.range.days} day(s), by ${data.range.bucket} (UTC)`
	);
	const fileSuffix = $derived(`${data.range.fromDay}_${data.range.toDay}`);
	const etb = (value: number) => formatCurrency(value, 'ETB');
	const utcStamp = (value: Date | string) =>
		new Date(value).toISOString().slice(0, 16).replace('T', ' ');

	const stats = $derived<Stat[]>([
		{
			key: 'revenue',
			group: 'money',
			format: 'money',
			label: 'Revenue',
			value: k.revenue,
			hint: 'Approved and Chapa payments, after discounts',
			tone: 'positive'
		},
		{
			key: 'paid',
			group: 'enrollments',
			format: 'count',
			label: 'Paid enrollments',
			value: k.paidEnrollments,
			hint: 'Payments confirmed in the period'
		},
		{
			key: 'free',
			group: 'enrollments',
			format: 'count',
			label: 'Free enrollments',
			value: k.freeEnrollments,
			hint: 'Free courses, 100% promos, staff enrolments'
		},
		{
			key: 'students',
			group: 'students',
			format: 'count',
			label: 'New students',
			value: k.newStudents,
			hint: 'Accounts created, staff excluded'
		},
		{
			key: 'completions',
			group: 'learning',
			format: 'count',
			label: 'Course completions',
			value: k.completions,
			hint: 'Courses finished in the period',
			tone: 'positive'
		},
		{
			key: 'rate',
			group: 'learning',
			format: 'percent',
			label: 'Completion rate',
			value: k.completionRate,
			hint: `${k.cohortCompleted} of ${k.cohort} enrollments started in the period are finished`
		},
		{
			key: 'certificates',
			group: 'learning',
			format: 'count',
			label: 'Certificates issued',
			value: k.certificates,
			hint: k.certificatesRevoked ? `${k.certificatesRevoked} since revoked` : 'None revoked'
		},
		{
			key: 'promo',
			group: 'money',
			format: 'money',
			label: 'Promo discounts given',
			value: k.promoDiscount,
			hint: `${k.promoRedemptions} redemption(s)`,
			tone: 'negative'
		},
		{
			key: 'pending',
			group: 'money',
			format: 'count',
			label: 'Payments to review',
			value: k.pendingPayments,
			hint: 'Right now, whatever the period',
			tone: k.pendingPayments ? 'warning' : 'neutral'
		}
	]);

	const TOP = 8;
	const shortName = (name: string) => (name.length > 32 ? `${name.slice(0, 30)}…` : name);

	const charts = $derived.by<ReportChartData[]>(() => {
		const byRevenue = report.courses.filter((row) => row.revenue > 0).slice(0, TOP);
		const byEnrollments = [...report.courses]
			.sort((a, b) => b.enrollments - a.enrollments || b.revenue - a.revenue)
			.slice(0, TOP);
		return [
			{
				key: 'revenue-time',
				group: 'money',
				title: 'Revenue over time',
				description: 'By payment provider, on the day the money was confirmed',
				kind: 'bar',
				stacked: true,
				money: true,
				wide: true,
				labels: report.revenueSeries.labels,
				series: report.revenueSeries.series
			},
			{
				key: 'enrollments-time',
				group: 'enrollments',
				title: 'Enrollments over time',
				description: 'Paid and free, on the day the enrollment became active',
				kind: 'bar',
				stacked: true,
				wide: true,
				labels: report.enrollmentSeries.labels,
				series: report.enrollmentSeries.series
			},
			{
				key: 'top-revenue',
				group: 'courses',
				title: 'Top courses by revenue',
				kind: 'bar',
				money: true,
				labels: byRevenue.map((row) => shortName(row.course)),
				series: [{ label: 'Revenue', data: byRevenue.map((row) => row.revenue) }]
			},
			{
				key: 'top-enrollments',
				group: 'courses',
				title: 'Top courses by enrollments',
				kind: 'bar',
				stacked: true,
				labels: byEnrollments.map((row) => shortName(row.course)),
				series: [
					{ label: 'Paid', data: byEnrollments.map((row) => row.paid) },
					{ label: 'Free', data: byEnrollments.map((row) => row.free) }
				]
			},
			{
				key: 'providers',
				group: 'money',
				title: 'Revenue by payment provider',
				description: report.providers
					.map((row) => `${PROVIDER_NAMES[row.provider]}: ${row.payments} payment(s)`)
					.join(' · '),
				kind: 'doughnut',
				money: true,
				labels: report.providers.map((row) => PROVIDER_NAMES[row.provider]),
				series: [{ label: 'Revenue', data: report.providers.map((row) => row.revenue) }]
			},
			{
				key: 'promos',
				group: 'money',
				title: 'Promo code redemptions',
				description: 'Discount given per code is in the table below',
				kind: 'bar',
				labels: report.promos.map((row) => row.code),
				series: [{ label: 'Redemptions', data: report.promos.map((row) => row.redemptions) }]
			}
		];
	});

	const courseColumns: ColumnDef<CourseRow>[] = [
		{ id: 'course', accessorKey: 'course', header: 'Course' },
		{ id: 'enrollments', accessorKey: 'enrollments', header: 'Enrollments', meta: { align: 'right' } },
		{ id: 'paid', accessorKey: 'paid', header: 'Paid', meta: { align: 'right' } },
		{ id: 'free', accessorKey: 'free', header: 'Free', meta: { align: 'right' } },
		{
			id: 'revenue',
			accessorKey: 'revenue',
			header: 'Revenue',
			meta: { align: 'right' },
			cell: ({ row }) => etb(row.original.revenue)
		},
		{ id: 'completed', accessorKey: 'completed', header: 'Completed', meta: { align: 'right' } },
		{
			id: 'completionRate',
			accessorKey: 'completionRate',
			header: 'Completion rate (%)',
			meta: { align: 'right' },
			cell: ({ row }) => `${row.original.completionRate}%`
		}
	];

	const paymentColumns: ColumnDef<PaymentRow>[] = [
		{
			id: 'paidAt',
			accessorFn: (row) => utcStamp(row.paidAt),
			header: 'Paid at'
		},
		{ id: 'student', accessorKey: 'student', header: 'Student' },
		{ id: 'email', accessorKey: 'email', header: 'Email' },
		{ id: 'course', accessorKey: 'course', header: 'Course' },
		{
			id: 'provider',
			accessorFn: (row) => PROVIDER_NAMES[row.provider],
			header: 'Provider'
		},
		{
			id: 'amount',
			accessorKey: 'amount',
			header: 'Amount',
			meta: { align: 'right' },
			cell: ({ row }) => etb(row.original.amount)
		},
		{
			id: 'discount',
			accessorKey: 'discount',
			header: 'Discount',
			meta: { align: 'right' },
			cell: ({ row }) => (row.original.discount ? etb(row.original.discount) : '—')
		},
		{ id: 'promoCode', accessorFn: (row) => row.promoCode ?? '', header: 'Promo code' },
		{ id: 'reference', accessorFn: (row) => row.reference ?? '', header: 'Reference' }
	];

	const promoColumns: ColumnDef<PromoRow>[] = [
		{ id: 'promoCode', accessorKey: 'code', header: 'Code' },
		{ id: 'redemptions', accessorKey: 'redemptions', header: 'Redemptions', meta: { align: 'right' } },
		{
			id: 'discount',
			accessorKey: 'discount',
			header: 'Discount given',
			meta: { align: 'right' },
			cell: ({ row }) => etb(row.original.discount)
		},
		{
			id: 'revenue',
			accessorKey: 'revenue',
			header: 'Paid after discount',
			meta: { align: 'right' },
			cell: ({ row }) => etb(row.original.revenue)
		}
	];
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Reports"
		description="Revenue, enrollments and learning outcomes for the period you pick."
	/>

	<div class="flex flex-col gap-3 rounded-xl border bg-card p-4">
		<nav class="flex flex-wrap items-center gap-2" aria-label="Period">
			{#each PRESETS as preset (preset.key)}
				<Button
					href="?range={preset.key}"
					size="sm"
					variant={data.range.preset === preset.key ? 'default' : 'outline'}
					aria-current={data.range.preset === preset.key ? 'true' : undefined}
				>
					{preset.label}
				</Button>
			{/each}
			<Button
				type="button"
				size="sm"
				variant={data.range.preset === 'custom' ? 'default' : 'outline'}
				aria-expanded={showCustom}
				onclick={() => (customOpen = !customOpen)}
			>
				<CalendarRange class="size-4" /> Custom
			</Button>
		</nav>
		{#if showCustom}
			<form method="GET" class="flex flex-wrap items-end gap-3">
				<input type="hidden" name="range" value="custom" />
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-muted-foreground">From</span>
					<Input type="date" name="from" value={data.range.fromDay} required class="w-44" />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-muted-foreground">To</span>
					<Input type="date" name="to" value={data.range.toDay} required class="w-44" />
				</label>
				<Button type="submit" size="sm">Apply</Button>
			</form>
		{/if}
		<p class="text-sm text-muted-foreground" data-testid="range-label">{rangeLabel}</p>
	</div>

	{#if k.pendingPayments}
		<Notice tone="warning" title="{k.pendingPayments} payment(s) waiting for review. ">
			They are not counted as revenue until approved.
			{#snippet actions()}
				<Button href="/dashboard/enrollments?status=PENDING" size="sm" variant="outline">
					Review payments
				</Button>
			{/snippet}
		</Notice>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="kpis">
		{#each stats as stat (stat.key)}
			<div data-kpi={stat.key}>
				<StatCard {stat} amharicMoney={false} />
			</div>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		{#each charts as chart (chart.key)}
			<ReportChart {chart} />
		{/each}
	</div>

	<PageSection
		title="Courses"
		hint="Every course with an enrollment that became active in the period, by revenue. Amounts in ETB."
	>
		{#key report.courses}
			<DataTable
				columns={courseColumns}
				data={report.courses}
				fileName="Courses {fileSuffix}"
				defaultPageSize={10}
			/>
		{/key}
	</PageSection>

	<PageSection
		title="Recent payments"
		hint="Confirmed payments in the period, newest first (up to 200). Times in UTC, amounts in ETB."
	>
		{#key report.payments}
			<DataTable
				columns={paymentColumns}
				data={report.payments}
				fileName="Payments {fileSuffix}"
				defaultPageSize={10}
				facetKeys={['provider']}
				facetLabels={{ provider: 'Provider' }}
			/>
		{/key}
	</PageSection>

	<PageSection title="Promo codes" hint="Codes used on enrollments that became active in the period. Amounts in ETB.">
		{#key report.promos}
			<DataTable
				columns={promoColumns}
				data={report.promos}
				fileName="Promo codes {fileSuffix}"
				defaultPageSize={10}
			/>
		{/key}
	</PageSection>
</div>
