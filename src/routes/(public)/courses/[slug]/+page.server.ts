import { error, fail, redirect } from '@sveltejs/kit';
import { buildBreadcrumbJsonLd, type BreadcrumbEntry } from '$lib/json-ld';
import type { CourseDetail } from '$lib/content/catalog.types';
import { m } from '$lib/paraglide/messages';
import { EnrollmentError, enrollFree, getEnrollment, progressByCourse } from '$lib/server/enrollment';
import { getCourse, listCourses } from '$lib/server/public-catalog';
import {
	courseRatingSummary,
	deleteOwnReview,
	ownReview,
	parseReview,
	publishedReviews,
	reviewWriteWait,
	saveReview
} from '$lib/server/reviews';
import { waitText } from '$lib/server/spam';
import { requireActionUser } from '$lib/server/student';
import { ROUTES, siteConfig } from '$lib/site';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** Reviews shown at first, and added by each "show more". */
const REVIEWS_PAGE = 5;
const REVIEWS_MAX = 200;

async function relatedCourses(course: CourseDetail) {
	if (!course.categoryId) return [];
	return (await listCourses({ categoryId: course.categoryId, pageSize: 5 })).items.filter((item) => item.slug !== course.slug)
		.slice(0, 4);
}

/** What the enroll card needs to pick its call to action: the viewer's place on the course. */
async function viewerEnrollment(userId: string | undefined, courseId: number) {
	if (!userId) return null;
	const found = await getEnrollment(userId, courseId);
	if (!found) return null;
	const progress = (await progressByCourse(userId, [courseId])).get(courseId);
	return {
		status: found.status,
		rejectionReason: found.rejectionReason,
		completed: found.completedAt !== null,
		progressPercent: progress?.percent ?? 0
	};
}

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const found = await getCourse(params.slug);
	if (!found) error(404, m.catalog_course_not_found());

	// The page only lists lessons, so their bodies, video links and resources stay on the server.
	const course = {
		...found,
		sections: found.sections.map((section) => ({
			...section,
			lessons: section.lessons.map(({ id, title, lessonType, durationSeconds, isMandatory, isPreview }) => ({
				id,
				title,
				lessonType,
				durationSeconds,
				isMandatory,
				isPreview
			}))
		}))
	} satisfies CourseDetail;

	const breadcrumbs: BreadcrumbEntry[] = [
		{ label: m.catalog_breadcrumb_home(), href: ROUTES.home },
		{ label: m.catalog_breadcrumb_courses(), href: ROUTES.courses.list },
		...(course.categoryName && course.categorySlug
			? [{ label: course.categoryName, href: ROUTES.categories.detail(course.categorySlug) }]
			: []),
		{ label: course.title }
	];

	const courseId = Number(course.id);
	const shown = Math.min(
		REVIEWS_MAX,
		Math.max(REVIEWS_PAGE, Math.ceil((Number(url.searchParams.get('reviews')) || 0) / REVIEWS_PAGE) * REVIEWS_PAGE)
	);
	const [enrollment, summary, reviews, own] = await Promise.all([
		viewerEnrollment(locals.user?.id, courseId),
		courseRatingSummary(courseId),
		publishedReviews(courseId, shown),
		locals.user ? ownReview(locals.user.id, courseId) : null
	]);
	// The live numbers, so a review just written shows here even before the catalog cache turns over.
	course.rating = summary.count ? summary.average : undefined;
	course.reviewCount = summary.count || undefined;

	const courseJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Course',
		name: course.title,
		description: course.shortDescription,
		provider: { '@type': 'Organization', name: siteConfig.name },
		...(summary.count > 0
			? {
					aggregateRating: {
						'@type': 'AggregateRating',
						ratingValue: summary.average,
						reviewCount: summary.count,
						bestRating: 5,
						worstRating: 1
					},
					review: reviews.slice(0, 5).map((review) => ({
						'@type': 'Review',
						author: { '@type': 'Person', name: review.author },
						datePublished: review.createdAt.slice(0, 10),
						reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
						...(review.comment ? { reviewBody: review.comment } : {})
					}))
				}
			: {})
	};

	return {
		course,
		enrollment,
		reviews: {
			summary,
			items: reviews,
			// The page takes no other query, so the link needs nothing but its own.
			moreHref:
				summary.count > reviews.length && shown < REVIEWS_MAX ? `?reviews=${shown + REVIEWS_PAGE}#reviews` : null,
			own
		},
		breadcrumbs,
		relatedCourses: await relatedCourses(course),
		jsonLd: [courseJsonLd, buildBreadcrumbJsonLd(url.origin, breadcrumbs)]
	};
};

/** The published course a review action is about, and the signed-in student writing it. */
async function reviewTarget(event: RequestEvent) {
	const user = requireActionUser(event);
	const found = await getCourse(event.params.slug);
	if (!found) error(404, m.catalog_course_not_found());
	return { user, courseId: Number(found.id) };
}

export const actions: Actions = {
	/** Free courses enroll here and open straight into the first lesson. */
	enroll: async (event) => {
		const { params } = event;
		const user = requireActionUser(event);
		const found = await getCourse(params.slug);
		if (!found) error(404, m.catalog_course_not_found());
		if (found.accessType === 'PAID') redirect(303, ROUTES.student.checkout(found.slug));
		try {
			await enrollFree(user.id, Number(found.id));
		} catch (err) {
			if (err instanceof EnrollmentError) return { enrollError: err.message };
			throw err;
		}
		redirect(303, ROUTES.student.learn(found.slug));
	},

	/** Writes or replaces the student's review; only an ACTIVE enrollment may. */
	review: async (event) => {
		const { user, courseId } = await reviewTarget(event);
		const enrollment = await getEnrollment(user.id, courseId);
		if (enrollment?.status !== 'ACTIVE') {
			return fail(403, { reviewError: m.catalog_review_error_not_enrolled() });
		}
		const parsed = parseReview(await event.request.formData());
		if (!parsed.ok) return fail(400, { reviewError: parsed.error });
		// Counted after validation, so fixing a mistake in the form does not use up attempts.
		const wait = reviewWriteWait(user.id);
		if (wait) return fail(429, { reviewError: m.catalog_review_error_too_many({ wait: waitText(wait) }) });
		return { reviewSaved: await saveReview(user.id, courseId, parsed) };
	},

	/** The author may always remove their own review, enrolled or not. */
	deleteReview: async (event) => {
		const { user, courseId } = await reviewTarget(event);
		const wait = reviewWriteWait(user.id);
		if (wait) return fail(429, { reviewError: m.catalog_review_error_too_many({ wait: waitText(wait) }) });
		if (!(await deleteOwnReview(user.id, courseId))) {
			return fail(404, { reviewError: m.catalog_review_error_none() });
		}
		return { reviewDeleted: true };
	}
};
