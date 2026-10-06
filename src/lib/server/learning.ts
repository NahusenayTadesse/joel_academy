import { and, asc, eq, inArray } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { db } from '$lib/server/db';
import { certificate, course, courseSection, lesson, lessonResource } from '$lib/server/db/schema';
import { playableVideo } from '$lib/server/video';
import { canAccessLesson, completedLessonIds, getEnrollment } from '$lib/server/enrollment';
import { courseProgress } from '$lib/progress';

/*
 * The learning page's read model. Only the lesson being viewed carries a body, and only when the
 * viewer may open it — locked lessons send their titles and nothing else.
 */

/**
 * Lesson bodies are sanitised when saved; this runs again on the way out so a row written some
 * other way (a seed, a migration, a direct edit) still cannot put script on a student's page.
 */
export function sanitizeLessonHtml(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: [...sanitizeHtml.defaults.allowedTags, 'h1', 'h2', 'img'],
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ['src', 'alt', 'title', 'width', 'height'],
			'*': ['class']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
		}
	});
}

/** A link we will put in an href: web addresses and our own paths, never `javascript:`. */
export function safeHref(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
	} catch {
		return null;
	}
}

export async function loadLearning(slug: string, userId: string, requestedLessonId: number | null) {
	const [row] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
	if (!row) return null;
	const current = await getEnrollment(userId, row.id);
	// An unpublished course stays open to the students already on it, and to no one else.
	if (!row.status && !current) return null;

	const [sections, lessons, done, [issued]] = await Promise.all([
		db.select().from(courseSection).where(eq(courseSection.courseId, row.id)).orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
		db
			.select({
				id: lesson.id,
				sectionId: lesson.sectionId,
				title: lesson.title,
				lessonType: lesson.lessonType,
				durationSeconds: lesson.durationSeconds,
				isPreview: lesson.isPreview,
				isMandatory: lesson.isMandatory
			})
			.from(lesson)
			.where(eq(lesson.courseId, row.id))
			.orderBy(asc(lesson.sortOrder), asc(lesson.id)),
		completedLessonIds(userId, row.id),
		db
			.select({ code: certificate.code, revokedAt: certificate.revokedAt })
			.from(certificate)
			.where(and(eq(certificate.userId, userId), eq(certificate.courseId, row.id)))
			.limit(1)
	]);

	// Lessons in curriculum order: section by section, as the sidebar lists them.
	const ordered = sections.flatMap((section) => lessons.filter((item) => item.sectionId === section.id));
	const curriculum = sections.map((section) => ({
		id: section.id,
		title: section.title,
		lessons: ordered
			.filter((item) => item.sectionId === section.id)
			.map((item) => ({
				...item,
				completed: done.has(item.id),
				locked: !canAccessLesson(current, item)
			}))
	}));
	const flat = curriculum.flatMap((section) => section.lessons);

	const requested = flat.find((item) => item.id === requestedLessonId);
	const active =
		requested ??
		flat.find((item) => !item.locked && !item.completed) ??
		flat.find((item) => !item.locked) ??
		flat[0] ??
		null;

	let lessonContent = null;
	if (active && !active.locked) {
		const [[body], resources] = await Promise.all([
			db
				.select({ content: lesson.content, videoUrl: lesson.videoUrl, externalUrl: lesson.externalUrl })
				.from(lesson)
				.where(eq(lesson.id, active.id)),
			db
				.select({ id: lessonResource.id, title: lessonResource.title, url: lessonResource.url })
				.from(lessonResource)
				.where(inArray(lessonResource.lessonId, [active.id]))
				.orderBy(asc(lessonResource.sortOrder), asc(lessonResource.id))
		]);
		lessonContent = {
			html: body?.content ? sanitizeLessonHtml(body.content) : '',
			// Only the player's own input is sent: a YouTube id, or a (signed) embed address.
			video: playableVideo(body?.videoUrl),
			externalUrl: safeHref(body?.externalUrl),
			resources: resources.map((resource) => ({ id: resource.id, title: resource.title, url: safeHref(resource.url) }))
		};
	}

	return {
		course: { id: row.id, title: row.name, slug: row.slug, certificateEnabled: row.certificateEnabled },
		enrollment: current
			? { status: current.status, rejectionReason: current.rejectionReason, completedAt: current.completedAt }
			: null,
		curriculum,
		progress: courseProgress(lessons, done),
		activeLessonId: active?.id ?? null,
		lessonContent,
		certificate: issued && !issued.revokedAt ? { code: issued.code } : null
	};
}
