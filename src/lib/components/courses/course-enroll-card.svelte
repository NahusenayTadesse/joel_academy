<script lang="ts" module>
	/** The signed-in viewer's place on the course, from the page's load. */
	export interface ViewerEnrollment {
		status: 'PENDING' | 'ACTIVE' | 'REJECTED';
		rejectionReason: string | null;
		completed: boolean;
		progressPercent: number;
	}
</script>

<script lang="ts">
	import Award from '@lucide/svelte/icons/award';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Signal from '@lucide/svelte/icons/signal';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import CourseThumbnail from '$lib/components/catalog/course-thumbnail.svelte';
	import PriceTag from '$lib/components/catalog/price-tag.svelte';
	import WishlistButton from '$lib/components/catalog/wishlist-button.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { DIFFICULTY_LABELS } from '$lib/content/catalog.constants';
	import type { CourseDetail } from '$lib/content/catalog.types';
	import { formatDurationMinutes } from '$lib/format';
	import { ROUTES } from '$lib/site';

	let {
		course,
		authenticated,
		enrollment = null
	}: {
		course: Pick<
			CourseDetail,
			| 'id'
			| 'title'
			| 'slug'
			| 'categoryName'
			| 'categorySlug'
			| 'thumbnailUrl'
			| 'accessType'
			| 'price'
			| 'discountPrice'
			| 'currency'
			| 'difficulty'
			| 'estimatedDurationMinutes'
			| 'certificateEnabled'
		>;
		authenticated: boolean;
		enrollment?: ViewerEnrollment | null;
	} = $props();

	const isFree = $derived(course.accessType === 'FREE');
	let enrolling = $state(false);

	/*
	 * The original card's calls to action, one per state: visitors register and come back here;
	 * students on the course continue it; free courses enroll in place; paid ones go to checkout.
	 * A payment under review or turned down says so, which the original left to its payments page.
	 */
	const active = $derived(enrollment?.status === 'ACTIVE' ? enrollment : null);
	const ctaHref = $derived(
		active
			? ROUTES.student.learn(course.slug)
			: authenticated
				? isFree
					? undefined
					: ROUTES.student.checkout(course.slug)
				: `${ROUTES.auth.register}?redirectTo=${encodeURIComponent(ROUTES.courses.detail(course.slug))}`
	);
	const ctaLabel = $derived(
		active
			? active.completed
				? 'Review Course'
				: active.progressPercent > 0
					? 'Continue Learning'
					: 'Start Learning'
			: authenticated
				? isFree
					? 'Enroll Free'
					: 'Enroll Now'
				: 'Sign Up to Enroll'
	);
</script>

<Card class="sticky top-24 overflow-hidden">
	<CourseThumbnail
		title={course.title}
		categoryName={course.categoryName}
		categorySlug={course.categorySlug}
		thumbnailUrl={course.thumbnailUrl}
		showBadge={false}
		class="aspect-video w-full rounded-t-xl rounded-b-none"
	/>
	<CardContent class="flex flex-col gap-4 p-5">
		<div class="flex items-center justify-between">
			<PriceTag
				accessType={course.accessType}
				price={course.price}
				discountPrice={course.discountPrice}
				currency={course.currency}
				class="text-xl"
			/>
			<WishlistButton courseId={course.id} courseTitle={course.title} />
		</div>

		{#if enrollment?.status === 'PENDING' && !isFree}
			<p class="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning">
				Your payment is under review. You'll get access as soon as it's approved.
			</p>
			<Button href={ROUTES.student.checkout(course.slug)} size="lg" variant="outline" class="w-full">
				View Payment Status
			</Button>
		{:else if enrollment?.status === 'REJECTED' && !isFree}
			<div class="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
				<p class="font-medium">Your payment was not approved.</p>
				{#if enrollment.rejectionReason}<p class="mt-1">{enrollment.rejectionReason}</p>{/if}
			</div>
			<Button href={ROUTES.student.checkout(course.slug)} size="lg" class="w-full">
				Resubmit Payment
			</Button>
		{:else if ctaHref}
			<Button href={ctaHref} size="lg" class="w-full">{ctaLabel}</Button>
		{:else}
			<form
				method="post"
				action="?/enroll"
				use:enhance={() => {
					enrolling = true;
					return async ({ result, update }) => {
						if (result.type === 'success' && typeof result.data?.enrollError === 'string') {
							toast.error('Could not start this course.', { description: result.data.enrollError });
						} else if (result.type === 'error') {
							toast.error('Could not start this course.', { description: 'Please try again.' });
						}
						await update();
						enrolling = false;
					};
				}}
			>
				<Button type="submit" size="lg" class="w-full" disabled={enrolling}>
					{#if enrolling}<LoaderCircle class="mr-2 size-4 animate-spin" />{/if}
					{enrolling ? 'Enrolling…' : ctaLabel}
				</Button>
			</form>
		{/if}

		<ul class="flex flex-col gap-2.5 text-sm text-muted-foreground">
			<li class="flex items-center gap-2">
				<Signal class="size-4 shrink-0" />
				{DIFFICULTY_LABELS[course.difficulty]} level
			</li>
			{#if course.estimatedDurationMinutes}
				<li class="flex items-center gap-2">
					<Clock class="size-4 shrink-0" />
					{formatDurationMinutes(course.estimatedDurationMinutes)} total
				</li>
			{/if}
			{#if course.certificateEnabled}
				<li class="flex items-center gap-2">
					<Award class="size-4 shrink-0" />
					Certificate of completion
				</li>
			{/if}
			<li class="flex items-center gap-2">
				<CircleCheck class="size-4 shrink-0" />
				Full lifetime access
			</li>
		</ul>
	</CardContent>
</Card>
