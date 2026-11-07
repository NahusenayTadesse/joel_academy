import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	category,
	certificate,
	course,
	courseReview,
	courseSection,
	enrollment,
	instructor,
	lesson,
	lessonResource,
	testimonial
} from '$lib/server/db/schema';
import type {
	Category,
	CategoryDetail,
	CourseDetail,
	CourseListParams,
	CourseListResult,
	CourseSection,
	CourseSummary
} from '$lib/content/catalog.types';
import type { Instructor } from '$lib/content/instructor.types';
import type { Testimonial } from '$lib/content/testimonial.types';
import { mediaUrl } from '$lib/media';
import { averageRating } from '$lib/components/reviews/rules';

/*
 * The public site's read model. Published courses, active categories and instructors are read once
 * into a short-lived process cache and filtered in memory: the catalog is a few hundred rows at
 * most, and every listing page needs the same set. Dashboard writes call `invalidateCatalog()`;
 * the TTL bounds staleness across several Node processes.
 */

const TTL_MS = 30_000;

/** One entry per line, as the dashboard forms store lists. */
export const splitLines = (value: string | null | undefined) =>
	(value ?? '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

type InstructorRow = typeof instructor.$inferSelect;

interface Snapshot {
	expires: number;
	courses: CourseSummary[];
	categories: Category[];
	instructors: InstructorRow[];
	/** Course id -> instructor slug, for instructor pages. */
	presenterSlugs: Map<string, string>;
}

let snapshot: Snapshot | undefined;
let pending: Promise<Snapshot> | undefined;

export function invalidateCatalog() {
	snapshot = undefined;
}

const visible = (table: typeof category | typeof instructor) =>
	and(eq(table.status, true), isNull(table.deletedAt));

async function loadSnapshot(): Promise<Snapshot> {
	const [categoryRows, instructorRows, courseRows, studentCounts, ratingRows] = await Promise.all([
		db.select().from(category).where(visible(category)).orderBy(asc(category.sortOrder), asc(category.name)),
		db.select().from(instructor).where(visible(instructor)).orderBy(asc(instructor.sortOrder), asc(instructor.name)),
		db
			.select({
				course,
				lessonCount: sql<number>`(select count(*) from ${lesson} where ${lesson.courseId} = ${course.id})`,
				moduleCount: sql<number>`(select count(*) from ${courseSection} where ${courseSection.courseId} = ${course.id})`
			})
			.from(course)
			.where(eq(course.status, true))
			.orderBy(asc(course.sortOrder), asc(course.id)),
		db
			.select({ courseId: enrollment.courseId, students: count() })
			.from(enrollment)
			.where(eq(enrollment.status, 'ACTIVE'))
			.groupBy(enrollment.courseId),
		db
			.select({ courseId: courseReview.courseId, reviews: count(), ratingSum: sql<number>`sum(${courseReview.rating})` })
			.from(courseReview)
			.where(eq(courseReview.status, 'PUBLISHED'))
			.groupBy(courseReview.courseId)
	]);

	const categories = new Map(categoryRows.map((row) => [row.id, row]));
	const instructors = new Map(instructorRows.map((row) => [row.id, row]));
	const students = new Map(studentCounts.map((row) => [row.courseId, row.students]));
	const ratings = new Map(
		ratingRows.map((row) => [
			row.courseId,
			{ rating: averageRating(Number(row.ratingSum), Number(row.reviews)), reviewCount: Number(row.reviews) }
		])
	);
	const presenterSlugs = new Map<string, string>();

	const courses = courseRows.map(({ course: row, lessonCount, moduleCount }): CourseSummary => {
		const owner = row.categoryId ? categories.get(row.categoryId) : undefined;
		const presenter = row.instructorId ? instructors.get(row.instructorId) : undefined;
		if (presenter) presenterSlugs.set(String(row.id), presenter.slug);
		const studentsCount = students.get(row.id);
		// Only courses with at least one published review carry a rating.
		const reviewed = ratings.get(row.id);
		return {
			id: String(row.id),
			title: row.name,
			subtitle: row.subtitle || undefined,
			slug: row.slug,
			shortDescription: row.shortDescription || row.description.slice(0, 200),
			thumbnailKey: null,
			thumbnailUrl: mediaUrl(row.thumbnail),
			presenterName: presenter?.name ?? 'Ethio AI School',
			categoryId: owner ? String(owner.id) : '',
			categoryName: owner?.name ?? '',
			categorySlug: owner?.slug ?? '',
			accessType: row.accessType,
			price: row.price,
			discountPrice: row.discountPrice,
			currency: row.currency,
			difficulty: row.difficulty,
			estimatedDurationMinutes: row.durationMinutes,
			certificateEnabled: row.certificateEnabled,
			featured: row.featured,
			publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
			rating: reviewed?.rating,
			reviewCount: reviewed?.reviewCount,
			studentsCount: studentsCount ? Number(studentsCount) : undefined,
			language: row.language,
			tags: splitLines(row.tags),
			lessonCount: Number(lessonCount),
			moduleCount: Number(moduleCount)
		};
	});

	return {
		expires: Date.now() + TTL_MS,
		courses,
		categories: categoryRows.map((row) => ({
			id: String(row.id),
			name: row.name,
			slug: row.slug,
			description: row.description,
			sortOrder: row.sortOrder
		})),
		instructors: instructorRows,
		presenterSlugs
	};
}

async function current(): Promise<Snapshot> {
	if (snapshot && snapshot.expires > Date.now()) return snapshot;
	// Concurrent requests after expiry share one reload instead of each querying.
	pending ??= loadSnapshot().finally(() => (pending = undefined));
	snapshot = await pending;
	return snapshot;
}

function matchesSearch(course: CourseSummary, search: string) {
	const needle = search.toLowerCase();
	return [course.title, course.shortDescription, course.presenterName, course.categoryName, ...(course.tags ?? [])].some(
		(value) => value.toLowerCase().includes(needle)
	);
}

const effectivePrice = (course: CourseSummary) =>
	course.accessType === 'FREE' ? 0 : Number(course.discountPrice ?? course.price);

const publishedTime = (course: CourseSummary) => Date.parse(course.publishedAt ?? '') || 0;

const SORTERS: Record<string, (a: CourseSummary, b: CourseSummary) => number> = {
	newest: (a, b) => publishedTime(b) - publishedTime(a),
	oldest: (a, b) => publishedTime(a) - publishedTime(b),
	title_asc: (a, b) => a.title.localeCompare(b.title),
	title_desc: (a, b) => b.title.localeCompare(a.title),
	price_asc: (a, b) => effectivePrice(a) - effectivePrice(b),
	price_desc: (a, b) => effectivePrice(b) - effectivePrice(a),
	featured: (a, b) => Number(b.featured) - Number(a.featured) || publishedTime(b) - publishedTime(a)
};

export async function listCourses(params: CourseListParams = {}): Promise<CourseListResult> {
	const { page = 1, pageSize = 12, search, accessType, difficulty, categoryId, featured, sort = 'newest' } = params;
	const { courses } = await current();
	const filtered = courses
		.filter(
			(course) =>
				(!search || matchesSearch(course, search)) &&
				(!accessType || course.accessType === accessType) &&
				(!difficulty || course.difficulty === difficulty) &&
				(!categoryId || course.categoryId === categoryId) &&
				(featured === undefined || course.featured === featured)
		)
		.sort(SORTERS[sort] ?? SORTERS.newest);
	const start = (Math.max(1, page) - 1) * pageSize;
	return { items: filtered.slice(start, start + pageSize), total: filtered.length };
}

export function featuredCourses(pageSize = 8): Promise<CourseListResult> {
	return listCourses({ featured: true, sort: 'featured', pageSize });
}

/** A published course with its full curriculum. Lesson bodies are included; callers trim them. */
export async function getCourse(slug: string): Promise<(CourseDetail & { instructorSlug?: string }) | undefined> {
	const snap = await current();
	const summary = snap.courses.find((entry) => entry.slug === slug);
	if (!summary) return undefined;
	const id = Number(summary.id);

	const [[row], sections, lessons] = await Promise.all([
		db.select().from(course).where(eq(course.id, id)),
		db.select().from(courseSection).where(eq(courseSection.courseId, id)).orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
		db.select().from(lesson).where(eq(lesson.courseId, id)).orderBy(asc(lesson.sortOrder), asc(lesson.id))
	]);
	if (!row) return undefined;
	const resources = lessons.length
		? await db
				.select()
				.from(lessonResource)
				.where(inArray(lessonResource.lessonId, lessons.map((item) => item.id)))
				.orderBy(asc(lessonResource.sortOrder), asc(lessonResource.id))
		: [];

	const curriculum: CourseSection[] = sections.map((section) => ({
		id: String(section.id),
		title: section.title,
		description: section.description,
		lessons: lessons
			.filter((item) => item.sectionId === section.id)
			.map((item) => ({
				id: String(item.id),
				title: item.title,
				lessonType: item.lessonType,
				durationSeconds: item.durationSeconds,
				isMandatory: item.isMandatory,
				isPreview: item.isPreview,
				content: item.content,
				videoUrl: item.videoUrl,
				externalUrl: item.externalUrl,
				resources: resources
					.filter((resource) => resource.lessonId === item.id)
					.map((resource) => ({
						id: String(resource.id),
						title: resource.title,
						externalUrl: resource.url,
						originalFileName: null,
						mimeType: null,
						fileSize: null
					}))
			}))
	}));

	return {
		...summary,
		description: row.description,
		outcomes: splitLines(row.outcomes),
		requirements: splitLines(row.requirements),
		introVideoUrl: row.introVideoUrl,
		sections: curriculum,
		instructorSlug: snap.presenterSlugs.get(summary.id)
	};
}

export async function listCategories(): Promise<Category[]> {
	return (await current()).categories;
}

/** Published course count per category id, for cards that show "12 courses". */
export async function categoryCourseCounts(): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const course of (await current()).courses) {
		if (course.categoryId) counts[course.categoryId] = (counts[course.categoryId] ?? 0) + 1;
	}
	return counts;
}

export async function getCategory(slug: string, page = 1, pageSize = 12): Promise<CategoryDetail | undefined> {
	const found = (await current()).categories.find((entry) => entry.slug === slug);
	if (!found) return undefined;
	const { id, name, description } = found;
	return {
		category: { id, name, slug, description },
		courses: await listCourses({ categoryId: id, page, pageSize })
	};
}

function toInstructor(row: InstructorRow, courses: CourseSummary[]): Instructor {
	const photo = mediaUrl(row.photo) ?? undefined;
	return {
		id: String(row.id),
		slug: row.slug,
		name: row.name,
		title: row.title,
		photoUrl: photo,
		avatarUrl: photo,
		bio: row.bio ?? undefined,
		skills: splitLines(row.skills),
		achievements: splitLines(row.achievements),
		courseCount: courses.length,
		courses
	};
}

/** Active instructors, each with the published courses they present, in dashboard order. */
export async function listInstructors(): Promise<Instructor[]> {
	const snap = await current();
	return snap.instructors.map((row) =>
		toInstructor(
			row,
			snap.courses.filter((course) => snap.presenterSlugs.get(course.id) === row.slug)
		)
	);
}

export async function getInstructor(slug: string): Promise<Instructor | undefined> {
	return (await listInstructors()).find((entry) => entry.slug === slug.toLowerCase());
}

export async function listTestimonials(): Promise<Testimonial[]> {
	const rows = await db
		.select()
		.from(testimonial)
		.where(and(eq(testimonial.status, true), isNull(testimonial.deletedAt)))
		.orderBy(asc(testimonial.sortOrder), asc(testimonial.id));
	return rows.map((row) => ({
		id: String(row.id),
		studentName: row.studentName,
		role: row.role,
		courseTitle: row.courseTitle,
		rating: row.rating,
		quote: row.quote,
		avatarUrl: null,
		avatarColor: 'from-emerald-500 to-emerald-700'
	}));
}

/** Platform-wide numbers, all counted from real rows. */
export async function platformStats() {
	const snap = await current();
	const [[students], [certificates]] = await Promise.all([
		db
			.select({ n: sql<number>`count(distinct ${enrollment.userId})` })
			.from(enrollment)
			.where(eq(enrollment.status, 'ACTIVE')),
		db.select({ n: count() }).from(certificate).where(isNull(certificate.revokedAt))
	]);
	return {
		studentsEnrolled: Number(students?.n ?? 0),
		certificatesIssued: Number(certificates?.n ?? 0),
		totalCourses: snap.courses.length,
		totalCategories: snap.categories.length,
		instructorCount: snap.instructors.length
	};
}
