<script lang="ts" module>
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
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
	import CourseThumbnail from '$lib/components/catalog/course-thumbnail.svelte';
	import PriceTag from '$lib/components/catalog/price-tag.svelte';
	import WishlistButton from '$lib/components/catalog/wishlist-button.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { DIFFICULTY_LABELS } from '$lib/content/catalog.constants';
	import type { CourseDetail } from '$lib/content/catalog.types';
	import { formatDurationMinutes } from '$lib/format';
	import { m } from '$lib/paraglide/messages';
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
				? m.catalog_enroll_review_course()
				: active.progressPercent > 0
					? m.catalog_enroll_continue()
					: m.catalog_enroll_start()
			: authenticated
				? isFree
					? m.catalog_enroll_free()
					: m.catalog_enroll_now()
				: m.catalog_enroll_sign_up()
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
				{m.catalog_enroll_pending()}
			</p>
			<Button href={ROUTES.student.checkout(course.slug)} size="lg" variant="outline" class="w-full">
				{m.catalog_enroll_view_payment()}
			</Button>
		{:else if enrollment?.status === 'REJECTED' && !isFree}
			<div class="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
				<p class="font-medium">{m.catalog_enroll_rejected()}</p>
				{#if enrollment.rejectionReason}<p class="mt-1">{enrollment.rejectionReason}</p>{/if}
			</div>
			<Button href={ROUTES.student.checkout(course.slug)} size="lg" class="w-full">
				{m.catalog_enroll_resubmit()}
			</Button>
		{:else if ctaHref}
			<Button href={ctaHref} size="lg" class="w-full">{ctaLabel}</Button>
		{:else}
			<ActionForm action="?/enroll" submit={() => {
					enrolling = true;
					return async ({ result, update }) => {
						if (result.type === 'success' && typeof result.data?.enrollError === 'string') {
							toast.error(m.catalog_enroll_could_not_start(), { description: result.data.enrollError });
						} else if (result.type === 'error') {
							toast.error(m.catalog_enroll_could_not_start(), { description: m.catalog_try_again() });
						}
						await update();
						enrolling = false;
					};
				}}>
				<Button type="submit" size="lg" class="w-full" disabled={enrolling}>
					{#if enrolling}<LoaderCircle class="mr-2 size-4 animate-spin" />{/if}
					{enrolling ? m.catalog_enroll_enrolling() : ctaLabel}
				</Button>
			</ActionForm>
		{/if}

		<ul class="flex flex-col gap-2.5 text-sm text-muted-foreground">
			<li class="flex items-center gap-2">
				<Signal class="size-4 shrink-0" />
				{m.catalog_enroll_level({ level: DIFFICULTY_LABELS[course.difficulty] })}
			</li>
			{#if course.estimatedDurationMinutes}
				<li class="flex items-center gap-2">
					<Clock class="size-4 shrink-0" />
					{m.catalog_enroll_duration_total({ duration: formatDurationMinutes(course.estimatedDurationMinutes) })}
				</li>
			{/if}
			{#if course.certificateEnabled}
				<li class="flex items-center gap-2">
					<Award class="size-4 shrink-0" />
					{m.catalog_enroll_certificate()}
				</li>
			{/if}
			<li class="flex items-center gap-2">
				<CircleCheck class="size-4 shrink-0" />
				{m.catalog_enroll_lifetime()}
			</li>
		</ul>
	</CardContent>
</Card>
