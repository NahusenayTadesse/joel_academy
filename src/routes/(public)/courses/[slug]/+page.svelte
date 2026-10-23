<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import Users from '@lucide/svelte/icons/users';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import PageBreadcrumb from '$lib/components/common/page-breadcrumb.svelte';
	import CourseChecklist from '$lib/components/courses/course-checklist.svelte';
	import CourseCurriculum from '$lib/components/courses/course-curriculum.svelte';
	import CourseEnrollCard from '$lib/components/courses/course-enroll-card.svelte';
	import CourseReviews from '$lib/components/reviews/course-reviews.svelte';
	import { reviewCountText } from '$lib/components/reviews/rules';
	import { jsonLdScript } from '$lib/json-ld';
	import { m } from '$lib/paraglide/messages';
	import Badge from '$lib/components/ui/badge.svelte';
	import { DIFFICULTY_LABELS } from '$lib/content/catalog.constants';
	import { formatCompactNumber } from '$lib/format';
	import { siteConfig } from '$lib/site';

	let { data, form } = $props();

	const course = $derived(data.course);
</script>

<svelte:head>
	<title>{course.title} · {siteConfig.name}</title>
	<meta name="description" content={course.shortDescription} />
	<meta property="og:title" content={course.title} />
	<meta property="og:description" content={course.shortDescription} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={course.title} />
	<meta name="twitter:description" content={course.shortDescription} />
	{@html jsonLdScript(data.jsonLd)}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
	<PageBreadcrumb items={data.breadcrumbs} />

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<div class="flex flex-col gap-8 lg:col-span-2">
			<div class="flex flex-col gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">{DIFFICULTY_LABELS[course.difficulty]}</Badge>
					{#if course.certificateEnabled}<Badge variant="info">{m.catalog_course_certificate_included()}</Badge>{/if}
					{#if course.language}<Badge variant="outline">{course.language}</Badge>{/if}
				</div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">{course.title}</h1>
				{#if course.subtitle}<p class="text-lg text-muted-foreground">{course.subtitle}</p>{/if}
				<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
					<span>
						{m.catalog_course_by()} <span class="font-medium text-foreground">{course.presenterName}</span>
					</span>
					{#if course.rating !== undefined}
						<a href="#reviews" class="flex items-center gap-1 hover:underline">
							<Star class="size-4 fill-warning text-warning" aria-hidden="true" />
							<span class="font-medium text-foreground">{course.rating.toFixed(1)}</span>
							<span class="sr-only">{m.catalog_course_out_of_five_sr()}</span>
							({reviewCountText(course.reviewCount ?? 0)})
						</a>
					{/if}
					{#if course.studentsCount !== undefined}
						<span class="flex items-center gap-1">
							<Users class="size-4" />
							{m.catalog_course_students({ count: formatCompactNumber(course.studentsCount) })}
						</span>
					{/if}
				</div>
			</div>

			<div class="prose prose-sm max-w-none text-foreground dark:prose-invert">
				<h2 class="text-lg font-semibold text-foreground">{m.catalog_course_about()}</h2>
				<p class="text-sm whitespace-pre-line text-muted-foreground">{course.description}</p>
			</div>

			<CourseChecklist title={m.catalog_course_outcomes()} items={course.outcomes} variant="check" />
			<CourseChecklist title={m.catalog_course_requirements()} items={course.requirements} variant="dot" />
			<CourseCurriculum sections={course.sections} />
			<CourseReviews
				summary={data.reviews.summary}
				reviews={data.reviews.items}
				moreHref={data.reviews.moreHref}
				viewer={{ enrollment: data.enrollment?.status ?? null, own: data.reviews.own }}
				error={form && 'reviewError' in form ? form.reviewError : undefined}
			/>
		</div>

		<div class="lg:col-span-1">
			<CourseEnrollCard {course} authenticated={data.user !== null} enrollment={data.enrollment} />
		</div>
	</div>

	{#if data.relatedCourses.length > 0}
		<div class="border-t border-border pt-8">
			<h2 class="mb-4 text-lg font-semibold text-foreground">{m.catalog_course_related()}</h2>
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.relatedCourses as relatedCourse (relatedCourse.id)}
					<CourseCard course={relatedCourse} />
				{/each}
			</div>
		</div>
	{/if}
</div>
