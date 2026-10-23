<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Award from '@lucide/svelte/icons/award';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import { toast } from 'svelte-sonner';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import ErrorState from '$lib/components/student/error-state.svelte';
	import LessonPlayer from '$lib/components/student/lesson-player.svelte';
	import LessonSidebar from '$lib/components/student/lesson-sidebar.svelte';
	import LessonTabs from '$lib/components/student/lesson-tabs.svelte';
	import QuizPlayer from '$lib/components/student/quiz/quiz-player.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { ROUTES, siteConfig } from '$lib/site';
	import { cn } from '@nahu/admin-kit/utils.js';

	let { data } = $props();

	const isMobile = new MediaQuery('max-width: 767px');
	/* `null` until toggled: open on desktop, an overlay closed by default on small screens. */
	let sidebarToggled = $state<boolean | null>(null);
	const sidebarOpen = $derived(sidebarToggled ?? !isMobile.current);
	let completing = $state(false);
	/* Per lesson: set by the player once the video has been watched (or cannot report progress). */
	let watchedLessonId = $state<number | null>(null);

	const lessonHref = (lessonId: number) => ROUTES.student.learn(data.course.slug, lessonId);
	const flatLessons = $derived(data.curriculum.flatMap((section) => section.lessons));
	const currentIndex = $derived(flatLessons.findIndex((lesson) => lesson.id === data.activeLessonId));
	const activeLesson = $derived(flatLessons[currentIndex]);
	const activeSection = $derived(
		data.curriculum.find((section) => section.lessons.some((lesson) => lesson.id === data.activeLessonId))
	);
	const previousLesson = $derived(currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined);
	const nextLesson = $derived(
		currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : undefined
	);

	const isActive = $derived(data.enrollment?.status === 'ACTIVE');
	/* A video lesson is completed by watching it, as in the original; a finished one stays open. */
	const mustWatch = $derived(
		Boolean(activeLesson && !activeLesson.completed && data.lessonContent?.video) &&
			watchedLessonId !== data.activeLessonId
	);
	const hasPreview = $derived(flatLessons.some((lesson) => !lesson.locked));
	/* A quiz is completed by passing it, never by the footer button alone. */
	const quizGate = $derived(activeLesson?.lessonType === 'QUIZ' && !data.lessonContent?.quiz?.passed);
	const courseHref = $derived(ROUTES.courses.detail(data.course.slug));
	const checkoutHref = $derived(ROUTES.student.checkout(data.course.slug));

	/* Why a lesson is shut, in the original's words for each access refusal. */
	const lockedCopy = $derived(
		data.enrollment?.status === 'PENDING'
			? {
					title: 'Payment under review',
					description: "We're reviewing your payment - you'll get access as soon as it's approved."
				}
			: data.enrollment?.status === 'REJECTED'
				? {
						title: 'Payment required',
						description: data.enrollment.rejectionReason
							? `Your payment was not approved: ${data.enrollment.rejectionReason}`
							: 'Your payment was not approved. Submit payment for this course to start learning.'
					}
				: {
						title: 'Enroll to unlock this lesson',
						description: 'This lesson is part of the full course. Enroll to start learning.'
					}
	);
</script>

<svelte:head>
	<title>{activeLesson ? `${activeLesson.title} · ` : ''}{data.course.title} · {siteConfig.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet lockedAction()}
	{#if data.enrollment?.status === 'PENDING'}
		<Button variant="outline" href={checkoutHref} class="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10">
			View Payment Status
		</Button>
	{:else if data.enrollment?.status === 'REJECTED'}
		<Button href={checkoutHref}>Resubmit Payment</Button>
	{:else}
		<Button href={courseHref}>View Course</Button>
	{/if}
{/snippet}

{#if !isActive && !hasPreview}
	<div class="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-6 bg-sidebar p-8 text-center">
		<ErrorState
			class="border-white/10 bg-white/5 [&_h3]:text-white"
			title={lockedCopy.title}
			description={lockedCopy.description}
			action={lockedAction}
		/>
		<Button variant="outline" href={ROUTES.student.courses} class="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10">
			Back to My Courses
		</Button>
	</div>
{:else}
	<div class="learn-shell flex h-[calc(100dvh-4rem)] min-h-[32rem] flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
		<header class="flex h-16 flex-none items-center justify-between border-b border-sidebar-border px-4 sm:px-6">
			<div class="flex min-w-0 items-center gap-4">
				<button
					type="button"
					onclick={() => (sidebarToggled = !sidebarOpen)}
					class="shrink-0 text-sidebar-foreground/60 hover:text-white"
					aria-label={sidebarOpen ? 'Hide course content' : 'Show course content'}
				>
					{#if sidebarOpen}<PanelLeftClose class="size-5" />{:else}<PanelLeftOpen class="size-5" />{/if}
				</button>
				<nav class="hidden min-w-0 items-center gap-2 text-xs text-sidebar-foreground/60 md:flex" aria-label="breadcrumb">
					<a href={ROUTES.student.courses} class="shrink-0 hover:text-white">My Courses</a>
					<ChevronRight class="size-3.5 shrink-0" />
					<span class="max-w-40 truncate text-sidebar-foreground/80">{data.course.title}</span>
					{#if activeSection}
						<ChevronRight class="size-3.5 shrink-0" />
						<span class="max-w-32 truncate text-sidebar-foreground/80">{activeSection.title}</span>
					{/if}
					{#if activeLesson}
						<ChevronRight class="size-3.5 shrink-0" />
						<span class="max-w-40 truncate font-medium text-white">{activeLesson.title}</span>
					{/if}
				</nav>
			</div>
			<div class="flex items-center gap-3">
				<Button
					variant="ghost"
					size="sm"
					href={ROUTES.student.courses}
					class="shrink-0 gap-1.5 text-xs text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
				>
					<ChevronLeft class="size-4" />
					<span>Back to Courses</span>
				</Button>
			</div>
		</header>

		<div class="relative flex flex-1 overflow-hidden">
			{#if sidebarOpen && isMobile.current}
				<button
					type="button"
					class="absolute inset-0 z-30 bg-black/50"
					onclick={() => (sidebarToggled = false)}
					aria-label="Hide course content"
				></button>
			{/if}
			{#if sidebarOpen}
				<aside
					class={cn(
						'flex-none overflow-hidden border-r border-sidebar-border bg-sidebar',
						isMobile.current ? 'absolute inset-y-0 left-0 z-40 w-[85vw] max-w-[300px] shadow-xl' : 'w-[300px]'
					)}
				>
					<LessonSidebar
						curriculum={data.curriculum}
						currentLessonId={data.activeLessonId}
						overallProgress={data.progress.percent}
						hrefFor={lessonHref}
						onSelectLesson={() => {
							if (isMobile.current) sidebarToggled = false;
						}}
					/>
				</aside>
			{/if}
			<div class="flex-1 overflow-y-auto">
				<div class="mx-auto w-full max-w-5xl px-4 py-8 pb-28 sm:px-6">
					{#if !activeLesson}
						<p class="text-sm text-sidebar-foreground/60">This course has no lessons yet.</p>
					{:else if activeLesson.locked || !data.lessonContent}
						<h1 class="text-2xl font-bold text-white">{activeLesson.title}</h1>
						<ErrorState
							icon={Lock}
							class="mt-6 border-white/10 bg-white/5 [&_h3]:text-white"
							title={lockedCopy.title}
							description={lockedCopy.description}
							action={lockedAction}
						/>
					{:else}
						{#if data.lessonContent.video}
							{#key activeLesson.id}
								<LessonPlayer
									video={data.lessonContent.video}
									title={activeLesson.title}
									completed={activeLesson.completed}
									onWatched={() => (watchedLessonId = activeLesson.id)}
									lessonId={activeLesson.id}
									resumeAt={data.lessonContent.resumeAt}
									positionUrl={data.lessonContent.positionUrl}
								/>
							{/key}
						{/if}
						<h1
							class={cn(
								'text-2xl font-bold text-white',
								data.lessonContent.video ? 'mt-6' : 'mt-0'
							)}
						>
							{activeLesson.title}
						</h1>
						{#if data.lessonContent.quiz}
							{#key activeLesson.id}
								<QuizPlayer lessonId={activeLesson.id} quiz={data.lessonContent.quiz} canSubmit={isActive} />
							{/key}
						{/if}
						{#key activeLesson.id}
							<LessonTabs
								lessonId={activeLesson.id}
								lessonType={activeLesson.lessonType}
								html={data.lessonContent.html}
								externalUrl={data.lessonContent.externalUrl}
								resources={data.lessonContent.resources}
							/>
						{/key}
					{/if}
				</div>
			</div>
		</div>

		<div class="flex flex-none items-center justify-between border-t border-sidebar-border bg-sidebar px-4 py-4 sm:px-6">
			<Button
				variant="outline"
				href={previousLesson ? lessonHref(previousLesson.id) : undefined}
				disabled={!previousLesson}
				data-sveltekit-noscroll
				data-sveltekit-replacestate
				class="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
			>
				<ChevronLeft class="size-4" />
				<span class="hidden sm:inline">Previous Lesson</span>
			</Button>

			{#if data.progress.completed && data.certificate}
				<Button
					href={ROUTES.student.certificate(data.certificate.code)}
					class="gap-2 bg-gradient-to-r from-amber-500 to-emerald-600 font-semibold text-white shadow-md hover:from-amber-600 hover:to-emerald-700"
				>
					<Award class="size-4" />
					<span>View Certificate</span>
					<ArrowRight class="size-4" />
				</Button>
			{:else if data.progress.completed}
				<Button href={ROUTES.student.courses} class="gap-2 bg-sidebar-primary bg-none text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
					<CircleCheck class="size-4" />
					<span>Course Completed</span>
				</Button>
			{:else if !isActive}
				<Button href={hasPreview ? courseHref : checkoutHref} class="gap-2">
					<span>Enroll to Track Progress</span>
					<ArrowRight class="size-4" />
				</Button>
			{:else if quizGate}
				<div class="flex items-center gap-3">
					<span class="hidden text-xs text-sidebar-foreground/60 sm:inline">Pass the quiz to continue</span>
					<Button disabled class="gap-2 bg-sidebar-primary bg-none text-sidebar-primary-foreground shadow-none">
						Complete & Next
						<ArrowRight class="size-4" />
					</Button>
				</div>
			{:else}
				<ActionForm action="?/complete" submit={() => {
						completing = true;
						return async ({ result, update }) => {
							completing = false;
							if (result.type === 'failure') {
								toast.error('Could not mark this lesson complete', {
									description: String(result.data?.error ?? 'Please try again.')
								});
								return;
							}
							if (result.type !== 'success') {
								await update();
								return;
							}
							const outcome = result.data as { courseCompleted: boolean; certificateCode: string | null };
							if (outcome.courseCompleted) {
								toast.success('Course completed!', {
									description: outcome.certificateCode
										? "Congratulations! You've finished all required lessons and earned your certificate."
										: "Congratulations! You've finished all required lessons."
								});
								await goto(
									outcome.certificateCode ? ROUTES.student.certificate(outcome.certificateCode) : ROUTES.student.courses,
									{ invalidateAll: true }
								);
								return;
							}
							toast.success('Lesson completed');
							if (nextLesson) await goto(lessonHref(nextLesson.id), { replaceState: true, noScroll: true, invalidateAll: true });
							else await update();
						};
					}}>
					<HiddenField name="lessonId" value={data.activeLessonId ?? ''} />
					<HiddenField name="next" value={nextLesson?.id ?? ''} />
					{#if mustWatch}
						<span class="mr-3 hidden text-xs text-sidebar-foreground/60 sm:inline">Watch the video to continue</span>
					{/if}
					<Button
						type="submit"
						class="gap-2 bg-sidebar-primary bg-none text-sidebar-primary-foreground shadow-none hover:bg-sidebar-primary/90"
						disabled={completing || !activeLesson || activeLesson.locked || mustWatch}
						title={mustWatch ? 'Watch the video to complete this lesson' : undefined}
					>
						{#if completing}<LoaderCircle class="size-4 animate-spin" />{/if}
						Complete & Next
						<ArrowRight class="size-4" />
					</Button>
				</ActionForm>
			{/if}
		</div>
	</div>
{/if}

<style>
	/*
	 * The player fills the screen below the sticky header. While the announcement bar (the
	 * layout's first child, until dismissed) sits above it, it is that much shorter too, so the
	 * lesson's action bar starts on screen.
	 */
	:global(.public-site:has(> .bg-brand:first-child)) .learn-shell {
		height: calc(100dvh - 4rem - 2.25rem);
	}
</style>
