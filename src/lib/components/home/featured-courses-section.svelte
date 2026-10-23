<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import { inView } from '$lib/attachments';
	import type { CourseSummary } from '$lib/content/catalog.types';
	import { m } from '$lib/paraglide/messages';
	import { ROUTES } from '$lib/site';
	import SectionTitle from './section-title.svelte';

	let { courses }: { courses: CourseSummary[] } = $props();
</script>

<section class="relative isolate">
	<div
		class="glow pointer-events-none absolute top-1/4 -left-1/4 -z-10 size-[44rem] opacity-15"
		aria-hidden="true"
	></div>
	<div class="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
		<SectionTitle
			eyebrow={m.home_featured_eyebrow()}
			title={m.home_featured_title()}
			accent={m.home_featured_accent()}
			subtitle={m.home_featured_subtitle()}
			link={{ href: ROUTES.courses.list, label: m.home_featured_link() }}
		/>
		{#if courses.length === 0}
			<EmptyState
				icon={BookOpen}
				title={m.home_featured_empty_title()}
				description={m.home_featured_empty_description()}
			/>
		{:else}
			<div
				class="reveal-stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
				{@attach inView()}
			>
				{#each courses as course (course.id)}
					<CourseCard {course} />
				{/each}
			</div>
		{/if}
	</div>
</section>
