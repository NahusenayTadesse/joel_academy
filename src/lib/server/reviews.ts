import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { db } from '$lib/server/db';
import { course, courseReview, user } from '$lib/server/db/schema';
import { invalidateCatalog } from '$lib/server/public-catalog';
import { m } from '$lib/paraglide/messages';
import {
	REVIEW_COMMENT_MAX,
	averageRating,
	reviewerName,
	summarizeRatings,
	type RatingSummary
} from '$lib/components/reviews/rules';

/*
 * Course reviews: one per student per course, written by students with an ACTIVE enrollment
 * (the caller checks that), shown publicly while PUBLISHED. Staff can hide one without deleting
 * it. Every write invalidates the catalog snapshot, which carries each course's average.
 */

export type ReviewStatus = (typeof courseReview.$inferSelect)['status'];

// ── Validation ──────────────────────────────────────────────────────────────────────────────

/** Anything this long is not a review typed into the form; refused before any parsing. */
const RAW_COMMENT_MAX = REVIEW_COMMENT_MAX * 5;

const ENTITIES: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };

/**
 * A comment as plain text: markup removed (its text kept, scripts and styles dropped), control
 * and bidi-override characters removed, at most one blank line in a row. Svelte escapes it on
 * the page anyway; this keeps HTML out of the stored text, the dashboard and the JSON-LD.
 */
export function plainTextComment(raw: string): string | null {
	const stripped = sanitizeHtml(raw.replace(/\r\n?/g, '\n'), { allowedTags: [], allowedAttributes: {} })
		// sanitize-html escapes the text it keeps; this is plain text, so undo that.
		.replace(/&(?:lt|gt|quot|#39|amp);/g, (entity) => ENTITIES[entity]);
	const clean = stripped
		// eslint-disable-next-line no-control-regex -- removing control characters is the point
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, '')
		.split('\n')
		.map((line) => line.replace(/\s+$/, ''))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return clean === '' ? null : clean;
}

export type ParsedReview =
	| { ok: true; rating: number; comment: string | null }
	| { ok: false; error: string };

/** The posted `rating` (a whole number 1–5) and optional `comment`, checked and cleaned. */
export function parseReview(form: FormData): ParsedReview {
	const ratingText = String(form.get('rating') ?? '').trim();
	if (!/^[1-5]$/.test(ratingText)) return { ok: false, error: m.catalog_review_error_rating() };

	const raw = form.get('comment');
	if (raw !== null && typeof raw !== 'string') return { ok: false, error: m.catalog_review_error_comment_text() };
	if ((raw ?? '').length > RAW_COMMENT_MAX) {
		return { ok: false, error: m.catalog_review_error_too_long({ max: REVIEW_COMMENT_MAX }) };
	}
	const comment = plainTextComment(raw ?? '');
	if (comment && Array.from(comment).length > REVIEW_COMMENT_MAX) {
		return { ok: false, error: m.catalog_review_error_too_long({ max: REVIEW_COMMENT_MAX }) };
	}
	return { ok: true, rating: Number(ratingText), comment };
}

// ── Rate limit ──────────────────────────────────────────────────────────────────────────────

/*
 * Writes per student (save or delete), in this process's memory like `$lib/server/spam`: a
 * person edits a review a few times at most; a script posting in a loop is held off.
 */
const WRITE_LIMITS = [
	{ limit: 5, windowMs: 60_000 },
	{ limit: 20, windowMs: 60 * 60_000 }
];
const writes = new Map<string, number[]>();

/** Counts one write for `userId`. Returns 0 when allowed, otherwise milliseconds to wait. */
export function reviewWriteWait(userId: string, now = Date.now()): number {
	const longest = Math.max(...WRITE_LIMITS.map((rule) => rule.windowMs));
	const times = (writes.get(userId) ?? []).filter((time) => now - time < longest);
	let wait = 0;
	for (const rule of WRITE_LIMITS) {
		const inWindow = times.filter((time) => now - time < rule.windowMs);
		if (inWindow.length >= rule.limit) wait = Math.max(wait, inWindow[0] + rule.windowMs - now);
	}
	if (wait === 0) times.push(now);
	if (times.length) writes.set(userId, times);
	else writes.delete(userId);
	return wait;
}

/** For tests. */
export function resetReviewLimits() {
	writes.clear();
}

// ── Public reads ────────────────────────────────────────────────────────────────────────────

const published = (courseId: number) =>
	and(eq(courseReview.courseId, courseId), eq(courseReview.status, 'PUBLISHED'));

export async function courseRatingSummary(courseId: number): Promise<RatingSummary> {
	const tallies = await db
		.select({ rating: courseReview.rating, count: count() })
		.from(courseReview)
		.where(published(courseId))
		.groupBy(courseReview.rating);
	return summarizeRatings(tallies.map((row) => ({ rating: row.rating, count: Number(row.count) })));
}

export interface PublicReview {
	id: number;
	author: string;
	rating: number;
	comment: string | null;
	createdAt: string;
}

/** Published reviews, newest first. Only the author's first name and last initial leave here. */
export async function publishedReviews(courseId: number, limit: number, offset = 0): Promise<PublicReview[]> {
	const rows = await db
		.select({
			id: courseReview.id,
			name: user.name,
			rating: courseReview.rating,
			comment: courseReview.comment,
			createdAt: courseReview.createdAt
		})
		.from(courseReview)
		.innerJoin(user, eq(user.id, courseReview.userId))
		.where(published(courseId))
		.orderBy(desc(courseReview.createdAt), desc(courseReview.id))
		.limit(limit)
		.offset(offset);
	return rows.map(({ name, createdAt, ...row }) => ({
		...row,
		author: reviewerName(name),
		createdAt: createdAt.toISOString()
	}));
}

export interface OwnReview {
	rating: number;
	comment: string | null;
	status: ReviewStatus;
	updatedAt: string;
}

export async function ownReview(userId: string, courseId: number): Promise<OwnReview | null> {
	const [row] = await db
		.select({
			rating: courseReview.rating,
			comment: courseReview.comment,
			status: courseReview.status,
			updatedAt: courseReview.updatedAt
		})
		.from(courseReview)
		.where(and(eq(courseReview.userId, userId), eq(courseReview.courseId, courseId)))
		.limit(1);
	return row ? { ...row, updatedAt: row.updatedAt.toISOString() } : null;
}

/** Ids of the courses this student has reviewed (any status), for "rate this course" prompts. */
export async function reviewedCourseIds(userId: string): Promise<Set<number>> {
	const rows = await db
		.select({ courseId: courseReview.courseId })
		.from(courseReview)
		.where(eq(courseReview.userId, userId));
	return new Set(rows.map((row) => row.courseId));
}

// ── Student writes (the caller has checked the enrollment) ──────────────────────────────────

/**
 * Creates or replaces the student's review. An edit keeps the review's status: a review staff
 * hid stays hidden when its author changes it.
 */
export async function saveReview(
	userId: string,
	courseId: number,
	input: { rating: number; comment: string | null }
): Promise<'created' | 'updated'> {
	const existing = await ownReview(userId, courseId);
	await db
		.insert(courseReview)
		.values({ userId, courseId, rating: input.rating, comment: input.comment })
		.onDuplicateKeyUpdate({ set: { rating: input.rating, comment: input.comment, updatedAt: sql`now()` } });
	invalidateCatalog();
	return existing ? 'updated' : 'created';
}

/** Removes the student's own review; false when there was none. */
export async function deleteOwnReview(userId: string, courseId: number): Promise<boolean> {
	const [result] = await db
		.delete(courseReview)
		.where(and(eq(courseReview.userId, userId), eq(courseReview.courseId, courseId)));
	invalidateCatalog();
	return result.affectedRows > 0;
}

// ── Staff ───────────────────────────────────────────────────────────────────────────────────

export async function staffReviews(limit = 2000) {
	return db
		.select({
			id: courseReview.id,
			courseId: courseReview.courseId,
			course: course.name,
			courseSlug: course.slug,
			studentName: user.name,
			studentEmail: user.email,
			rating: courseReview.rating,
			comment: courseReview.comment,
			status: courseReview.status,
			createdAt: courseReview.createdAt,
			updatedAt: courseReview.updatedAt
		})
		.from(courseReview)
		.innerJoin(course, eq(course.id, courseReview.courseId))
		.innerJoin(user, eq(user.id, courseReview.userId))
		.orderBy(desc(courseReview.createdAt), desc(courseReview.id))
		.limit(limit);
}

/** Per reviewed course: the public average (published only) and how many are hidden. */
export async function staffCourseAverages() {
	const rows = await db
		.select({
			courseId: courseReview.courseId,
			course: course.name,
			published: sql<number>`sum(${courseReview.status} = 'PUBLISHED')`,
			hidden: sql<number>`sum(${courseReview.status} = 'HIDDEN')`,
			publishedSum: sql<number>`coalesce(sum(case when ${courseReview.status} = 'PUBLISHED' then ${courseReview.rating} end), 0)`
		})
		.from(courseReview)
		.innerJoin(course, eq(course.id, courseReview.courseId))
		.groupBy(courseReview.courseId, course.name)
		.orderBy(asc(course.name));
	return rows.map((row) => {
		const publishedCount = Number(row.published);
		return {
			courseId: row.courseId,
			course: row.course,
			published: publishedCount,
			hidden: Number(row.hidden),
			average: publishedCount ? averageRating(Number(row.publishedSum), publishedCount) : null
		};
	});
}

export async function setReviewStatus(id: number, status: ReviewStatus): Promise<boolean> {
	const [result] = await db.update(courseReview).set({ status }).where(eq(courseReview.id, id));
	invalidateCatalog();
	return result.affectedRows > 0;
}

export async function deleteReview(id: number): Promise<boolean> {
	const [result] = await db.delete(courseReview).where(eq(courseReview.id, id));
	invalidateCatalog();
	return result.affectedRows > 0;
}
