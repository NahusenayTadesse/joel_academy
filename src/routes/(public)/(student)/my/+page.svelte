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
	import { m } from '$lib/paraglide/messages';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const mostRecent = $derived(data.continueLearning[0]);
	const banner = $derived.by(() => {
		if (mostRecent)
			return {
				description: m.learn_home_banner_progress({ percent: Math.round(mostRecent.progressPercent), title: mostRecent.title }),
				ctaLabel: m.learn_home_resume(),
				ctaHref: ROUTES.student.learn(mostRecent.slug),
				icon: undefined
			};
		if (data.stats.completed > 0)
			return {
				description:
					data.stats.completed === 1
						? m.learn_home_banner_completed_one()
						: m.learn_home_banner_completed_many({ count: data.stats.completed }),
				ctaLabel: m.learn_browse_courses_cta(),
				ctaHref: ROUTES.courses.list,
				icon: Search
			};
		return {
			description: m.learn_home_banner_empty(),
			ctaLabel: m.learn_browse_courses_cta(),
			ctaHref: ROUTES.courses.list,
			icon: Search
		};
	});

	const stats = $derived([
		{ icon: BookOpen, label: m.learn_stat_enrolled(), value: data.stats.enrolled, tone: 'primary' as const, href: ROUTES.student.courses },
		{ icon: Loader, label: m.learn_in_progress(), value: data.stats.inProgress, tone: 'info' as const, href: `${ROUTES.student.courses}?status=IN_PROGRESS` },
		{ icon: CircleCheck, label: m.learn_completed_plural(), value: data.stats.completed, tone: 'success' as const, href: `${ROUTES.student.courses}?status=COMPLETED` },
		{ icon: Award, label: m.learn_certificates(), value: data.stats.certificates, tone: 'warning' as const, href: ROUTES.student.certificates },
		{ icon: ListChecks, label: m.learn_stat_lessons_done(), value: data.stats.lessonsDone, tone: 'teal' as const, href: undefined },
		{ icon: Clock, label: m.learn_stat_time_learned(), value: formatLearningTime(data.stats.secondsLearned), tone: 'primary' as const, href: undefined }
	]);
	const wishlistCount = $derived(data.wishlistIds?.length ?? 0);
	const warningText = 'text-[color-mix(in_srgb,var(--warning)_45%,black)] dark:text-warning';
</script>

<svelte:head>
	<title>{m.learn_home_title()} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<WelcomeBanner
			class={mostRecent ? 'lg:col-span-2' : 'lg:col-span-3'}
			greeting="{m.learn_home_greeting({ name: data.firstName })} 👋"
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
						{m.learn_home_pending_one_before()} <strong class="font-semibold">{data.pendingPayments[0].title}</strong>
						{m.learn_home_pending_one_after()}
					{:else}
						{m.learn_home_pending_many({ count: data.pendingPayments.length })}
					{/if}
					{m.learn_home_pending_unlock()}
				</span>
			</p>
			<a href={ROUTES.student.payments} class="shrink-0 font-medium underline-offset-4 hover:underline">{m.learn_home_view_payments()}</a>
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
					{m.learn_home_rejected_before()} <strong class="font-semibold">{payment.title}</strong>{payment.rejectionReason
						? `: ${payment.rejectionReason}`
						: '.'}
				</span>
			</p>
			<Button href={ROUTES.student.checkout(payment.slug)} variant="outline" size="sm" class="shrink-0">
				{m.learn_home_resubmit_payment()}
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
				<h2 id="continue-learning" class="text-2xl font-bold text-foreground">{m.learn_home_continue()}</h2>
				<Button variant="link" href={ROUTES.student.courses} class="h-auto p-0">{m.learn_view_all()}</Button>
			</div>
			{#if data.continueLearning.length === 0}
				<EmptyState
					icon={BookOpen}
					title={data.stats.completed > 0 ? m.learn_all_caught_up() : m.learn_no_courses_title()}
					description={data.stats.completed > 0
						? m.learn_home_all_done_desc()
						: m.learn_no_courses_desc()}
				>
					{#snippet action()}
						<Button href={ROUTES.courses.list}>{m.learn_browse_courses()}</Button>
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
						{m.learn_home_wishlist_saved({ count: wishlistCount })}
					</span>
					<span class="shrink-0 font-medium text-primary-ink">{m.learn_view()}</span>
				</a>
			{/if}
		</section>

		<div class="flex min-w-0 flex-col gap-6">
			<ActivityCard title={m.learn_home_recent_notifications()} viewAllHref={ROUTES.student.notifications}>
				{#if data.notifications.length === 0}
					<EmptyState
						icon={Bell}
						title={m.learn_caught_up_title()}
						description={m.learn_caught_up_desc()}
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

			<ActivityCard title={m.learn_home_recent_certificates()} viewAllHref={ROUTES.student.certificates}>
				{#if data.recentCertificates.length === 0}
					<EmptyState
						icon={Award}
						title={m.learn_no_certificates_title()}
						description={m.learn_no_certificates_desc()}
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
											{item.code} · {m.learn_issued_on({ date: formatDate(item.issuedAt) })}
										</span>
									</span>
									{#if item.revoked}<Badge variant="destructive" class="shrink-0">{m.learn_revoked()}</Badge>{/if}
								</a>
							</li>
						{/each}
					</ol>
				{/if}
			</ActivityCard>
		</div>
	</div>
</div>
