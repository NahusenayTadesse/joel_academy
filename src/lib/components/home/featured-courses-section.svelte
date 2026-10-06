<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import EmptyState from '$lib/components/common/empty-state.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import type { CourseSummary } from '$lib/content/catalog.types';
	import { ROUTES } from '$lib/site';

	let { courses }: { courses: CourseSummary[] } = $props();
</script>

<section class="border-t border-border bg-muted/20">
	<div class="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
		<div class="mb-8 flex items-end justify-between gap-4">
			<div>
				<h2 class="text-2xl font-semibold tracking-tight text-foreground">Featured courses</h2>
				<p class="mt-1 text-sm text-muted-foreground">Hand-picked courses to get you started.</p>
			</div>
			<Button href={ROUTES.courses.list} variant="ghost" class="hidden sm:inline-flex">
				Browse all
				<ArrowRight class="size-4" />
			</Button>
		</div>
		{#if courses.length === 0}
			<EmptyState icon={BookOpen} title="No featured courses yet" description="Check back soon." />
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{#each courses as course (course.id)}
					<CourseCard {course} />
				{/each}
			</div>
		{/if}
	</div>
</section>
