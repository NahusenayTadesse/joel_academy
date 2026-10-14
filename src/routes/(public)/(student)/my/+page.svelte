<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import Bell from '@lucide/svelte/icons/bell';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Heart from '@lucide/svelte/icons/heart';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Loader from '@lucide/svelte/icons/loader';
	import Search from '@lucide/svelte/icons/search';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import CourseProgressCard from '$lib/components/student/course-progress-card.svelte';
	import ActivityCard from '$lib/components/student/home/activity-card.svelte';
	import { formatDate, formatLearningTime } from '$lib/components/student/home/format';
	import NotificationCard from '$lib/components/student/home/notification-card.svelte';
	import ProgressCard from '$lib/components/student/home/progress-card.svelte';
	import StatCard from '$lib/components/student/home/stat-card.svelte';
	import WelcomeBanner from '$lib/components/student/home/welcome-banner.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const mostRecent = $derived(data.continueLearning[0]);
	const banner = $derived.by(() => {
		if (mostRecent)
			return {
				description: `You've completed ${Math.round(mostRecent.progressPercent)}% of "${mostRecent.title}". Keep up the momentum!`,
				ctaLabel: 'Resume Learning',
				ctaHref: ROUTES.student.learn(mostRecent.slug),
				icon: undefined
			};
		if (data.stats.completed > 0)
			return {
				description: `You've completed ${data.stats.completed === 1 ? 'your course' : `all ${data.stats.completed} of your courses`}. Find your next one in the catalog.`,
				ctaLabel: 'Browse Courses',
				ctaHref: ROUTES.courses.list,
				icon: Search
			};
		return {
			description: "You haven't enrolled in any courses yet - browse the catalog to get started.",
			ctaLabel: 'Browse Courses',
			ctaHref: ROUTES.courses.list,
			icon: Search
		};
	});

	const stats = $derived([
		{ icon: BookOpen, label: 'Enrolled Courses', value: data.stats.enrolled, tone: 'primary' as const, href: ROUTES.student.courses },
		{ icon: Loader, label: 'In Progress', value: data.stats.inProgress, tone: 'info' as const, href: `${ROUTES.student.courses}?status=IN_PROGRESS` },
		{ icon: CircleCheck, label: 'Completed', value: data.stats.completed, tone: 'success' as const, href: `${ROUTES.student.courses}?status=COMPLETED` },
		{ icon: Award, label: 'Certificates', value: data.stats.certificates, tone: 'warning' as const, href: ROUTES.student.certificates },
		{ icon: ListChecks, label: 'Lessons Done', value: data.stats.lessonsDone, tone: 'teal' as const, href: undefined },
		{ icon: Clock, label: 'Time Learned', value: formatLearningTime(data.stats.secondsLearned), tone: 'primary' as const, href: undefined }
	]);
	const wishlistCount = $derived(data.wishlistIds?.length ?? 0);
	const warningText = 'text-[color-mix(in_srgb,var(--warning)_45%,black)] dark:text-warning';
</script>

<svelte:head>
	<title>My Learning · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<WelcomeBanner
			class={mostRecent ? 'lg:col-span-2' : 'lg:col-span-3'}
			greeting="Welcome back, {data.firstName} 👋"
			description={banner.description}
			ctaLabel={banner.ctaLabel}
			ctaHref={banner.ctaHref}
			ctaIcon={banner.icon}
		/>
		{#if mostRecent}
			<ProgressCard
				label={mostRecent.title}
				description={mostRecent.categoryName}
				value={mostRecent.progressPercent}
				href={ROUTES.student.learn(mostRecent.slug)}
			/>
		{/if}
	</div>

	{#if data.pendingPayments.length > 0}
		<div
			class="flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between {warningText}"
			role="status"
		>
			<p class="flex items-start gap-2">
				<Clock class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span>
					{#if data.pendingPayments.length === 1}
						Your payment for <strong class="font-semibold">{data.pendingPayments[0].title}</strong> is awaiting review.
					{:else}
						You have {data.pendingPayments.length} payments awaiting review.
					{/if}
					Course access unlocks once an admin approves it.
				</span>
			</p>
			<a href={ROUTES.student.payments} class="shrink-0 font-medium underline-offset-4 hover:underline">View payments</a>
		</div>
	{/if}

	{#each data.rejectedPayments as payment (payment.id)}
		<div
			class="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
			role="alert"
		>
			<p class="flex min-w-0 items-start gap-2">
				<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span class="min-w-0 break-words">
					Payment not approved for <strong class="font-semibold">{payment.title}</strong>{payment.rejectionReason
						? `: ${payment.rejectionReason}`
						: '.'}
				</span>
			</p>
			<Button href={ROUTES.student.checkout(payment.slug)} variant="outline" size="sm" class="shrink-0">
				Resubmit payment
			</Button>
		</div>
	{/each}

	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
		{#each stats as stat (stat.label)}
			<StatCard {...stat} />
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<section class="flex min-w-0 flex-col gap-4 lg:col-span-2" aria-labelledby="continue-learning">
			<div class="flex items-center justify-between">
				<h2 id="continue-learning" class="text-2xl font-bold text-foreground">Continue Learning</h2>
				<Button variant="link" href={ROUTES.student.courses} class="h-auto p-0">View All</Button>
			</div>
			{#if data.continueLearning.length === 0}
				<EmptyState
					icon={BookOpen}
					title={data.stats.completed > 0 ? 'All caught up' : 'No courses yet'}
					description={data.stats.completed > 0
						? "You've finished every course you're enrolled in."
						: "You haven't enrolled in any courses yet."}
				>
					{#snippet action()}
						<Button href={ROUTES.courses.list}>Browse courses</Button>
					{/snippet}
				</EmptyState>
			{:else}
				{#each data.continueLearning as item (item.id)}
					<CourseProgressCard
						href={ROUTES.student.learn(item.slug)}
						title={item.title}
						category={item.categoryName}
						categorySlug={item.categorySlug}
						thumbnailUrl={item.thumbnailUrl}
						progressPercent={item.progressPercent}
						completedLessons={item.completedLessons}
						totalLessons={item.totalLessons}
					/>
				{/each}
			{/if}
			{#if wishlistCount > 0}
				<a
					href={ROUTES.student.wishlist}
					class="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-primary/30"
				>
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
						<Heart class="size-4" aria-hidden="true" />
					</span>
					<span class="min-w-0 flex-1 text-foreground">
						{wishlistCount === 1 ? '1 course' : `${wishlistCount} courses`} saved in your wishlist
					</span>
					<span class="shrink-0 font-medium text-primary-ink">View</span>
				</a>
			{/if}
		</section>

		<div class="flex min-w-0 flex-col gap-6">
			<ActivityCard title="Recent Notifications" viewAllHref={ROUTES.student.notifications}>
				{#if data.notifications.length === 0}
					<EmptyState
						icon={Bell}
						title="You're all caught up"
						description="New notifications will appear here."
						class="border-none bg-transparent p-6"
					/>
				{:else}
					<ul class="flex flex-col gap-1">
						{#each data.notifications as notification (notification.id)}
							<li><NotificationCard {notification} /></li>
						{/each}
					</ul>
				{/if}
			</ActivityCard>

			<ActivityCard title="Recent Certificates" viewAllHref={ROUTES.student.certificates}>
				{#if data.recentCertificates.length === 0}
					<EmptyState
						icon={Award}
						title="No certificates yet"
						description="Complete a certificate-eligible course to earn your first certificate."
						class="border-none bg-transparent p-6"
					/>
				{:else}
					<ol class="flex flex-col gap-1">
						{#each data.recentCertificates as item (item.id)}
							<li>
								<a
									href={ROUTES.student.certificate(item.code)}
									class="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
								>
									<span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
										<Award class="size-4" aria-hidden="true" />
									</span>
									<span class="min-w-0 flex-1">
										<span class="block text-sm font-medium break-words text-foreground">{item.courseTitle}</span>
										<span class="mt-0.5 block text-xs text-muted-foreground">
											{item.code} · Issued {formatDate(item.issuedAt)}
										</span>
									</span>
									{#if item.revoked}<Badge variant="destructive" class="shrink-0">Revoked</Badge>{/if}
								</a>
							</li>
						{/each}
					</ol>
				{/if}
			</ActivityCard>
		</div>
	</div>
</div>
