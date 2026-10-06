import { error, redirect } from '@sveltejs/kit';
import { buildBreadcrumbJsonLd, type BreadcrumbEntry } from '$lib/json-ld';
import type { CourseDetail } from '$lib/content/catalog.types';
import { EnrollmentError, enrollFree, getEnrollment, progressByCourse } from '$lib/server/enrollment';
import { getCourse, listCourses } from '$lib/server/public-catalog';
import { requireActionUser } from '$lib/server/student';
import { ROUTES, siteConfig } from '$lib/site';
import type { Actions, PageServerLoad } from './$types';

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
	if (!found) error(404, 'Course not found');

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
		{ label: 'Home', href: ROUTES.home },
		{ label: 'Courses', href: ROUTES.courses.list },
		...(course.categoryName && course.categorySlug
			? [{ label: course.categoryName, href: ROUTES.categories.detail(course.categorySlug) }]
			: []),
		{ label: course.title }
	];

	const courseJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Course',
		name: course.title,
		description: course.shortDescription,
		provider: { '@type': 'Organization', name: siteConfig.name },
		...(course.rating !== undefined
			? {
					aggregateRating: {
						'@type': 'AggregateRating',
						ratingValue: course.rating,
						reviewCount: course.studentsCount ?? 0
					}
				}
			: {})
	};

	return {
		course,
		enrollment: await viewerEnrollment(locals.user?.id, Number(course.id)),
		breadcrumbs,
		relatedCourses: await relatedCourses(course),
		jsonLd: [courseJsonLd, buildBreadcrumbJsonLd(url.origin, breadcrumbs)]
	};
};

export const actions: Actions = {
	/** Free courses enroll here and open straight into the first lesson. */
	enroll: async (event) => {
		const { params } = event;
		const user = requireActionUser(event);
		const found = await getCourse(params.slug);
		if (!found) error(404, 'Course not found');
		if (found.accessType === 'PAID') redirect(303, ROUTES.student.checkout(found.slug));
		try {
			await enrollFree(user.id, Number(found.id));
		} catch (err) {
			if (err instanceof EnrollmentError) return { enrollError: err.message };
			throw err;
		}
		redirect(303, ROUTES.student.learn(found.slug));
	}
};
