<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import Notice from '@nahu/admin-kit/components/Notice.svelte';
	import StatCard from '@nahu/admin-kit/components/reports/StatCard.svelte';
	import type { Stat } from '@nahu/admin-kit/components/reports/types';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	let { data } = $props();

	type Tile = { stat: Stat; href: string };

	const tiles = $derived.by<Tile[]>(() => {
		const catalog: Tile[] = [
			{
				href: '/dashboard/courses',
				stat: {
					key: 'published',
					group: 'catalog',
					format: 'count',
					label: 'Published courses',
					value: data.published,
					hint: `${data.courses - data.published} in draft`,
					tone: 'positive'
				}
			}
		];
		const a = data.academy;
		if (!a) return catalog;
		return [
			...catalog,
			{
				href: '/dashboard/enrollments?status=ACTIVE',
				stat: {
					key: 'students',
					group: 'students',
					format: 'count',
					label: 'Students',
					value: a.students,
					hint: `${a.active} with an active enrolment`
				}
			},
			{
				href: '/dashboard/enrollments?status=PENDING',
				stat: {
					key: 'pending',
					group: 'students',
					format: 'count',
					label: 'Payments to review',
					value: a.pending,
					hint: a.pending ? 'Waiting for approval' : 'All caught up',
					tone: a.pending ? 'warning' : 'neutral'
				}
			},
			{
				href: '/dashboard/messages?status=NEW',
				stat: {
					key: 'messages',
					group: 'outreach',
					format: 'count',
					label: 'New messages',
					value: a.newMessages,
					hint: a.newMessages ? 'Unread' : 'Inbox is clear',
					tone: a.newMessages ? 'warning' : 'neutral'
				}
			},
			{
				href: '/dashboard/certificates',
				stat: {
					key: 'certificates',
					group: 'students',
					format: 'count',
					label: 'Certificates issued',
					value: a.certificates,
					hint: 'Valid, not revoked',
					tone: 'positive'
				}
			},
			{
				href: '/dashboard/subscribers',
				stat: {
					key: 'subscribers',
					group: 'outreach',
					format: 'count',
					label: 'Newsletter subscribers',
					value: a.subscribers,
					hint: 'Signed up from the site footer'
				}
			}
		];
	});
</script>

<div class="flex flex-col gap-6">
	<PageHeader
		title="Academy overview"
		description="What needs your attention, and how the academy is doing."
	/>

	{#if data.academy?.pending}
		<Notice tone="warning" title="{data.academy.pending} payment(s) waiting for review. ">
			Those students cannot start their course until you approve the receipt.
			{#snippet actions()}
				<Button href="/dashboard/enrollments?status=PENDING" size="sm">Review payments</Button>
			{/snippet}
		</Notice>
	{/if}
	{#if data.academy?.newMessages}
		<Notice title="{data.academy.newMessages} new message(s). ">
			Visitors wrote in through the contact form.
			{#snippet actions()}
				<Button href="/dashboard/messages?status=NEW" size="sm" variant="outline">Open inbox</Button
				>
			{/snippet}
		</Notice>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each tiles as tile (tile.stat.key)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- dashboard paths with a status query -->
			<a
				href={tile.href}
				class="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<StatCard stat={tile.stat} />
			</a>
		{/each}
	</div>

	<div class="flex flex-wrap gap-2">
		<Button href="/dashboard/courses">Manage courses</Button>
		{#if data.academy}
			<Button href="/dashboard/reports" variant="outline">View reports</Button>
			<Button href="/dashboard/enrollments" variant="outline">Enrollments</Button>
			<Button href="/dashboard/payment-methods" variant="outline">Payment methods</Button>
		{/if}
	</div>
</div>
