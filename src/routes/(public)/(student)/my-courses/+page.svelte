<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import SearchX from '@lucide/svelte/icons/search-x';
	import Star from '@lucide/svelte/icons/star';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import VerifyEmailNotice from '$lib/components/auth/verify-email-notice.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import PageHeader from '$lib/components/common/page-header.svelte';
	import SearchBar from '$lib/components/courses/search-bar.svelte';
	import CourseProgressCard from '$lib/components/student/course-progress-card.svelte';
	import LinkTabs from '$lib/components/student/link-tabs.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data, form } = $props();

	function withParams(changes: Record<string, string | undefined>) {
		const params = new URLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(changes)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		const query = params.toString();
		return query ? `?${query}` : page.url.pathname;
	}

	const tabs = $derived(
		[
			{ value: 'ALL', label: 'All' },
			{ value: 'IN_PROGRESS', label: 'In Progress' },
			{ value: 'COMPLETED', label: 'Completed' }
		].map((tab) => ({ ...tab, href: withParams({ status: tab.value === 'ALL' ? undefined : tab.value }) }))
	);
	const hasActiveFilters = $derived(Boolean(data.search) || data.status !== 'ALL');

	/** Paid enrollments not yet active lead back to checkout, which shows their payment state. */
	function hrefFor(item: (typeof data.items)[number]) {
		return item.status === 'ACTIVE' ? ROUTES.student.learn(item.slug) : ROUTES.student.checkout(item.slug);
	}
</script>

<svelte:head>
	<title>My Courses · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
	<PageHeader title="My Courses" description="Courses you're enrolled in - active, in progress, and completed." />

	{#if data.emailVerification === 'confirmed'}
		<p class="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success-ink" role="status">
			<CircleCheck class="size-4" aria-hidden="true" /> Email verified successfully.
		</p>
	{:else if data.emailVerification}
		<VerifyEmailNotice
			email={data.emailVerification.email}
			resent={Boolean(form && 'resent' in form && form.resent)}
			error={form && 'resendError' in form ? form.resendError : undefined}
		/>
	{/if}

	<LinkTabs label="Filter by progress" {tabs} current={data.status} />

	<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
		<div class="flex flex-wrap items-center gap-2">
			<SearchBar
				placeholder="Search your courses..."
				value={data.search}
				onSearch={(value) => goto(withParams({ search: value || undefined }), { keepFocus: true, noScroll: true })}
				class="w-full sm:w-64"
			/>
		</div>
	</div>

	{#if data.items.length === 0}
		{#if hasActiveFilters && data.total > 0}
			<EmptyState icon={SearchX} title="No results found" description="Try adjusting your search or filters.">
				{#snippet action()}
					<Button variant="outline" href={page.url.pathname}>Reset filters</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState icon={BookOpen} title="No courses yet" description="You haven't enrolled in any courses yet.">
				{#snippet action()}
					<Button href={ROUTES.courses.list}>Browse courses</Button>
				{/snippet}
			</EmptyState>
		{/if}
	{:else}
		<div class="flex flex-col gap-4">
			{#each data.items as item (item.id)}
				<div class="flex flex-col gap-1.5">
					<CourseProgressCard
						href={hrefFor(item)}
						title={item.title}
						category={item.categoryName}
						categorySlug={item.categorySlug}
						thumbnailUrl={item.thumbnailUrl}
						progressPercent={item.progressPercent}
						completedLessons={item.completedLessons}
						totalLessons={item.totalLessons}
						status={item.status}
						completed={item.completed}
						rejectionReason={item.rejectionReason}
					/>
					{#if item.askToRate}
						<a
							href="{ROUTES.courses.detail(item.slug)}#reviews"
							class="flex items-center gap-1.5 self-end px-1 py-1 text-sm font-medium text-brand-ink hover:underline"
						>
							<Star class="size-4 fill-warning text-warning" aria-hidden="true" />
							Rate this course<span class="sr-only">: {item.title}</span>
						</a>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
