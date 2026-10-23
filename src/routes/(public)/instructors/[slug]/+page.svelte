<script lang="ts">
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { page } from '$app/state';
	import CourseCard from '$lib/components/catalog/course-card.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import { buildBreadcrumbJsonLd, jsonLdScript } from '$lib/json-ld';
	import { m } from '$lib/paraglide/messages';
	import PageBreadcrumb from '$lib/components/common/page-breadcrumb.svelte';
	import { ROUTES, siteConfig } from '$lib/site';

	let { data } = $props();

	const instructor = $derived(data.instructor);
	const courses = $derived(instructor.courses);
	const breadcrumbItems = $derived([
		{ label: m.catalog_breadcrumb_home(), href: ROUTES.home },
		{ label: m.catalog_breadcrumb_instructors(), href: ROUTES.instructors.list },
		{ label: instructor.name }
	]);
</script>

<svelte:head>
	<title>{instructor.name} · {siteConfig.name}</title>
	<meta name="description" content={m.catalog_instructor_meta_description({ name: instructor.name })} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialized JSON with `<` escaped -->
	{@html jsonLdScript(buildBreadcrumbJsonLd(page.url.origin, breadcrumbItems))}
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
	<PageBreadcrumb items={breadcrumbItems} />

	<!-- Instructor profile header card -->
	<div
		class="overflow-hidden rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-md sm:p-8"
	>
		<div class="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
			{#if instructor.photoUrl}
				<div
					class="relative size-36 shrink-0 overflow-hidden rounded-2xl border-2 border-brand/20 shadow-md sm:size-44"
				>
					<img src={instructor.photoUrl} alt={instructor.name} class="size-full object-cover" />
				</div>
			{:else}
				<span class="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-ink">
					<UserRound class="size-12" />
				</span>
			{/if}

			<div class="space-y-4">
				<div>
					<div class="flex items-center gap-2">
						<Badge variant="secondary" class="bg-brand/10 text-xs font-medium text-brand-ink">
							{m.catalog_instructor_badge()}
						</Badge>
					</div>
					<h1 class="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						{instructor.name}
					</h1>
					{#if instructor.title}
						<p class="mt-0.5 text-sm font-semibold text-brand-ink">{instructor.title}</p>
					{/if}
				</div>

				{#if instructor.bio}
					<p class="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
						{instructor.bio}
					</p>
				{/if}

				{#if instructor.achievements && instructor.achievements.length > 0}
					<div class="space-y-1.5 pt-1">
						{#each instructor.achievements as item, index (index)}
							<div class="flex items-center gap-2 text-xs text-foreground/90">
								<CircleCheck class="size-4 shrink-0 text-brand-ink" />
								<span>{item}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if instructor.skills && instructor.skills.length > 0}
					<div class="flex flex-wrap items-center gap-1.5 pt-2">
						{#each instructor.skills as skill (skill)}
							<Badge variant="outline" class="text-[11px]">{skill}</Badge>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Courses section -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold tracking-tight text-foreground">
				{m.catalog_instructor_courses_heading({ name: instructor.name })}
			</h2>
			<span class="text-xs text-muted-foreground">
				{m.catalog_course_count({ count: courses.length })}
			</span>
		</div>

		{#if courses.length === 0}
			<div class="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
				<p class="text-sm">{m.catalog_instructor_no_courses()}</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each courses as course (course.id)}
					<CourseCard {course} />
				{/each}
			</div>
		{/if}
	</div>
</div>
