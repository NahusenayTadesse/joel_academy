<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
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
	import type { CourseInterest, Ranked } from '$lib/server/analytics';

	let { data } = $props();

	const a = $derived(data.analytics);
	const k = $derived(data.analytics.kpis);

	const PRESETS = [
		{ key: '7d', label: 'Last 7 days' },
		{ key: '30d', label: 'Last 30 days' },
		{ key: '90d', label: 'Last 90 days' },
		{ key: 'year', label: 'This year' }
	] as const;
	const LANGUAGES: Record<string, string> = { en: 'English', am: 'Amharic' };
	const DEVICES: Record<string, string> = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer' };

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

	const stats = $derived<Stat[]>([
		{
			key: 'visitors',
			group: 'traffic',
			format: 'count',
			label: 'Visitors',
			value: k.visitors,
			hint: 'People per day, added up over the period'
		},
		{
			key: 'views',
			group: 'traffic',
			format: 'count',
			label: 'Page views',
			value: k.views,
			hint: `${k.viewsPerVisitor} page(s) per visitor`
		},
		{
			key: 'signups',
			group: 'growth',
			format: 'count',
			label: 'New accounts',
			value: k.signups,
			hint: `${k.signupRate}% of visitors`,
			tone: 'positive'
		},
		{
			key: 'amharic',
			group: 'growth',
			format: 'percent',
			label: 'Reading in Amharic',
			value: k.amharicShare,
			hint: 'Share of visitors on the Amharic site'
		}
	]);

	/* Each funnel step as a share of the first, and of the step before it. */
	const funnel = $derived.by(() => {
		const first = a.funnel[0]?.value ?? 0;
		return a.funnel.map((step, index) => {
			const previous = index > 0 ? a.funnel[index - 1].value : null;
			return {
				...step,
				width: first ? Math.max((step.value / first) * 100, step.value ? 1.5 : 0) : 0,
				fromPrevious: previous ? Math.round((step.value / previous) * 1000) / 10 : null
			};
		});
	});

	const share = (rows: Ranked[], names: Record<string, string> = {}) => ({
		labels: rows.map((row) => names[row.label] ?? row.label),
		series: [{ label: 'Visitors', data: rows.map((row) => row.visitors) }]
	});

	const charts = $derived<ReportChartData[]>([
		{
			key: 'traffic',
			group: 'traffic',
			title: 'Traffic over time',
			description: 'Visitors and page views in each period',
			kind: 'line',
			wide: true,
			labels: a.traffic.labels,
			series: [
				{ label: 'Visitors', data: a.traffic.visitors },
				{ label: 'Page views', data: a.traffic.views }
			]
		},
		{
			key: 'devices',
			group: 'audience',
			title: 'Devices',
			description: 'Visitors by kind of device',
			kind: 'doughnut',
			...share(a.devices, DEVICES)
		},
		{
			key: 'languages',
			group: 'audience',
			title: 'Language',
			description: 'Visitors on the English and Amharic site',
			kind: 'doughnut',
			...share(a.languages, LANGUAGES)
		}
	]);

	const rankedColumns = (header: string, names: Record<string, string> = {}): ColumnDef<Ranked>[] => [
		{ id: 'label', accessorFn: (row) => names[row.label] ?? row.label, header },
		{ id: 'visitors', accessorKey: 'visitors', header: 'Visitors', meta: { align: 'right' } },
		{ id: 'views', accessorKey: 'views', header: 'Views', meta: { align: 'right' } }
	];
	const courseColumns: ColumnDef<CourseInterest>[] = [
		{ id: 'course', accessorKey: 'course', header: 'Course' },
		{ id: 'visitors', accessorKey: 'visitors', header: 'Course page visitors', meta: { align: 'right' } },
		{
			id: 'checkoutVisitors',
			accessorKey: 'checkoutVisitors',
			header: 'Went to checkout',
			meta: { align: 'right' }
		},
		{
			id: 'rate',
			accessorFn: (row) => (row.visitors ? Math.round((row.checkoutVisitors / row.visitors) * 1000) / 10 : 0),
			header: 'Checkout rate (%)',
			meta: { align: 'right' },
			cell: ({ getValue }) => `${getValue()}%`
		}
	];

	const sections = $derived([
		{ key: 'pages', title: 'Top pages', hint: 'Paths without the /am prefix; both languages together.', rows: a.pages, columns: rankedColumns('Page') },
		{ key: 'referrers', title: 'Where visitors come from', hint: 'Other sites that linked here. Apps that hide the referrer (many Telegram and WhatsApp links) count as direct and are not listed.', rows: a.referrers, columns: rankedColumns('Site') },
		{ key: 'sources', title: 'Campaigns (utm_source)', hint: 'Add ?utm_source=telegram (or facebook, tiktok…) to links you share to see them here.', rows: a.sources, columns: rankedColumns('Source') },
		{ key: 'countries', title: 'Countries', hint: 'From Cloudflare; empty when the request did not pass through it.', rows: a.countries, columns: rankedColumns('Country') },
		{ key: 'browsers', title: 'Browsers', hint: '', rows: a.browsers, columns: rankedColumns('Browser') },
		{ key: 'systems', title: 'Operating systems', hint: '', rows: a.systems, columns: rankedColumns('System') }
	]);
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Analytics"
		description="Who visits the site, where they come from, and how many go on to pay. Counted by the site itself: no cookies, no third parties; staff and bots are left out."
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
				<HiddenField name="range" value="custom" />
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
		<p class="text-sm text-muted-foreground">{rangeLabel}</p>
	</div>

	{#if k.views === 0}
		<Notice tone="info" title="No visits recorded in this period yet.">
			Counting started when analytics was switched on; earlier visits were not recorded.
		</Notice>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each stats as stat (stat.key)}
			<StatCard {stat} amharicMoney={false} />
		{/each}
	</div>

	<PageSection
		title="From visit to payment"
		hint="Course and checkout steps count visitors; the last two count bank-transfer receipts in the period. Percentages compare each step with the one before."
	>
		<ol class="flex flex-col gap-3">
			{#each funnel as step (step.key)}
				<li class="grid gap-1.5 sm:grid-cols-[12rem_1fr_7rem] sm:items-center sm:gap-4">
					<div>
						<p class="text-sm font-medium text-foreground">{step.label}</p>
						<p class="text-xs text-muted-foreground">{step.hint}</p>
					</div>
					<div class="h-7 rounded-md bg-muted" title="{step.label}: {step.value}">
						<div class="h-full rounded-md bg-primary" style="width: {step.width}%"></div>
					</div>
					<p class="text-sm tabular-nums sm:text-right">
						<span class="font-semibold text-foreground">{step.value}</span>
						{#if step.fromPrevious !== null}
							<span class="text-muted-foreground"> · {step.fromPrevious}%</span>
						{/if}
					</p>
				</li>
			{/each}
		</ol>
	</PageSection>

	<div class="grid gap-4 lg:grid-cols-2">
		{#each charts as chart (chart.key)}
			<ReportChart {chart} />
		{/each}
	</div>

	<PageSection
		title="Course interest"
		hint="How many visitors looked at each course, and how many of them opened its checkout."
	>
		{#key a.courses}
			<DataTable columns={courseColumns} data={a.courses} fileName="Course interest {fileSuffix}" defaultPageSize={10} />
		{/key}
	</PageSection>

	<div class="grid gap-6 xl:grid-cols-2">
		{#each sections as section (section.key)}
			<PageSection title={section.title} hint={section.hint || undefined}>
				{#key section.rows}
					<DataTable
						columns={section.columns}
						data={section.rows}
						fileName="{section.title} {fileSuffix}"
						defaultPageSize={10}
					/>
				{/key}
			</PageSection>
		{/each}
	</div>
</div>
