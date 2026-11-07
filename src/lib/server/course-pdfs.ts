import { and, asc, eq, inArray } from 'drizzle-orm';
import { parseYouTubeUrl, youtubeWatchUrl } from '@nahu/admin-kit/youtube';
import { db } from '$lib/server/db';
import {
	course,
	courseHandout,
	courseSection,
	instructor,
	lesson,
	lessonResource,
	type HANDOUT_STYLES
} from '$lib/server/db/schema';
import { canAccessLesson, getEnrollment, type Enrollment } from '$lib/server/enrollment';
import { handoutLinks } from '$lib/server/handouts';
import { sanitizeLessonHtml } from '$lib/server/dashboard/sanitize';
import { safeHref } from '$lib/server/learning';
import { siteUrl } from '$lib/server/email/notify';
import { attachmentDisposition } from '$lib/server/lesson-files';
import { brandedPdf, type DocBlock, type OutlineRow } from '$lib/server/pdf/branded';
import { htmlToBlocks, plain, textToBlocks, type Block, type Inline } from '$lib/server/pdf/html';
import { DOWNLOADS, HANDOUT_STYLE_NAMES } from '$lib/downloads';
import { lessonFileHref } from '$lib/lesson-files';
import { formatDurationSeconds } from '$lib/format';
import { siteConfig } from '$lib/site';

/*
 * The course's branded PDFs: its outline, a workbook per section, and the handouts staff write.
 * All are drawn on request from the current rows, so an edit shows up in the next download.
 * The PDFs are English apart from what staff wrote (which may be Amharic), like the certificate.
 *
 * Who gets what follows the learning page: anyone who can see a course gets its outline and its
 * PUBLIC handouts; lesson notes need the lesson to be open to them (`canAccessLesson`), and
 * STUDENTS handouts an active enrollment. Staff who edit courses get everything, drafts too.
 */

export interface PdfViewer {
	userId: string | null;
	/** Staff who edit courses: every course, lesson and handout, published or not. */
	staff: boolean;
}

type CourseRow = typeof course.$inferSelect;
type HandoutRow = typeof courseHandout.$inferSelect;
type HandoutStyle = (typeof HANDOUT_STYLES)[number];

export interface CourseScope {
	course: CourseRow;
	enrollment: Enrollment | undefined;
	staff: boolean;
	/** An active enrollment, or staff: every lesson and every handout is open. */
	full: boolean;
}

/** The course a download names, if this viewer may see it at all. */
export async function courseScope(slug: string, viewer: PdfViewer): Promise<CourseScope | null> {
	const [row] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
	if (!row) return null;
	const enrollment = viewer.userId ? await getEnrollment(viewer.userId, row.id) : undefined;
	// An unpublished course stays open to the students already on it, as on the learning page.
	if (!row.status && !enrollment && !viewer.staff) return null;
	return { course: row, enrollment, staff: viewer.staff, full: viewer.staff || enrollment?.status === 'ACTIVE' };
}

/** Whether a handout may be downloaded, given the course it belongs to. */
export function handoutOpen(handout: Pick<HandoutRow, 'published' | 'audience'>, scope: CourseScope): boolean {
	return (handout.published || scope.staff) && (handout.audience === 'PUBLIC' || scope.full);
}

// ── Formatting ───────────────────────────────────────────────────────────────

const LESSON_TYPE_NAMES: Record<string, string> = {
	VIDEO: 'Video',
	TEXT: 'Reading',
	DOCUMENT: 'Document',
	DOWNLOAD: 'Download',
	EXTERNAL_LINK: 'Link',
	QUIZ: 'Quiz'
};

const DIFFICULTY_NAMES: Record<string, string> = {
	BEGINNER: 'Beginner',
	INTERMEDIATE: 'Intermediate',
	ADVANCED: 'Advanced',
	ALL_LEVELS: 'All levels'
};

/** 12000 → "3 h 20 min"; 300 → "5 min". */
export function totalDuration(seconds: number): string | null {
	const minutes = Math.round(seconds / 60);
	if (minutes <= 0) return null;
	const hours = Math.floor(minutes / 60);
	return hours ? `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}` : `${minutes} min`;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function lessonDetail(row: { lessonType: string; durationSeconds: number | null }) {
	const name = LESSON_TYPE_NAMES[row.lessonType] ?? 'Lesson';
	return row.durationSeconds ? `${name} · ${formatDurationSeconds(row.durationSeconds)}` : name;
}

/** One-entry-per-line text (outcomes, requirements) as list items. */
const linesOf = (text: string | null) =>
	(text ?? '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

const itemsOf = (lines: string[]): Block[][] => lines.map((line) => [{ type: 'paragraph', content: plain(line) }]);

const heading = (text: string, level: 2 | 3 | 4 = 2): Block => ({ type: 'heading', level, content: plain(text) });

const link = (text: string, href: string): Inline => ({ kind: 'text', text, style: { href } });

/** A file name fit for every operating system: no path or reserved characters. */
const fileNameOf = (...parts: string[]) =>
	`${parts
		.join(' - ')
		.replace(/[\\/:*?"<>|]+/g, '-')
		.replace(/\s+/g, ' ')
		.trim()}.pdf`;

/** A handout's body as its style prints it. */
export function styledBlocks(blocks: Block[], style: HandoutStyle): DocBlock[] {
	if (style === 'CHECKLIST') {
		const tick = (block: Block): Block =>
			block.type === 'list'
				? { ...block, marker: 'check', items: block.items.map((item) => item.map(tick)) }
				: block.type === 'quote'
					? { ...block, blocks: block.blocks.map(tick) }
					: block;
		return blocks.map(tick);
	}
	if (style === 'WORKSHEET') {
		// Room to answer under each top-level list item; a worksheet without lists gets a page of lines.
		const answered = blocks.map((block): Block => (block.type === 'list' ? { ...block, lines: 3 } : block));
		const hasLists = blocks.some((block) => block.type === 'list');
		return [
			{ type: 'fields', labels: ['Name', 'Date'] },
			...answered,
			...(hasLists ? [] : ([heading('Your answers', 3), { type: 'lines', count: 12 }] satisfies DocBlock[]))
		];
	}
	return blocks;
}

const handoutBlocks = (row: Pick<HandoutRow, 'content' | 'style'>) =>
	styledBlocks(htmlToBlocks(sanitizeLessonHtml(row.content)), row.style);

function base() {
	return { academyName: siteConfig.name, siteUrl: siteUrl('/') };
}

// ── Course data ──────────────────────────────────────────────────────────────

async function curriculumOf(courseId: number) {
	const [sections, lessons] = await Promise.all([
		db
			.select()
			.from(courseSection)
			.where(eq(courseSection.courseId, courseId))
			.orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
		db
			.select({
				id: lesson.id,
				sectionId: lesson.sectionId,
				title: lesson.title,
				lessonType: lesson.lessonType,
				durationSeconds: lesson.durationSeconds,
				isPreview: lesson.isPreview
			})
			.from(lesson)
			.where(eq(lesson.courseId, courseId))
			.orderBy(asc(lesson.sortOrder), asc(lesson.id))
	]);
	return sections.map((section, index) => ({
		...section,
		number: index + 1,
		lessons: lessons.filter((row) => row.sectionId === section.id)
	}));
}

type Curriculum = Awaited<ReturnType<typeof curriculumOf>>;

function outlineRows(section: Curriculum[number], scope: CourseScope): OutlineRow[] {
	return section.lessons.map((row, index) => {
		const open = scope.staff || canAccessLesson(scope.enrollment, row);
		return {
			number: `${section.number}.${index + 1}`,
			title: row.title,
			detail: lessonDetail(row),
			tag: row.isPreview && !scope.full ? 'Free preview' : undefined,
			muted: !open
		};
	});
}

const secondsOf = (rows: { durationSeconds: number | null }[]) => rows.reduce((sum, row) => sum + (row.durationSeconds ?? 0), 0);

export interface BuiltPdf {
	bytes: Uint8Array;
	fileName: string;
}

// ── Documents ────────────────────────────────────────────────────────────────

/** Everything about the course on paper: what it is, what it teaches, every section and lesson. */
export async function courseOutlinePdf(scope: CourseScope): Promise<BuiltPdf> {
	const row = scope.course;
	const [curriculum, [presenter], handouts] = await Promise.all([
		curriculumOf(row.id),
		row.instructorId
			? db.select({ name: instructor.name, title: instructor.title }).from(instructor).where(eq(instructor.id, row.instructorId))
			: [],
		handoutLinks(row.id, scope.full)
	]);
	const lessons = curriculum.flatMap((section) => section.lessons);
	const courseUrl = siteUrl(`/courses/${encodeURIComponent(row.slug)}`);

	const blocks: DocBlock[] = [];
	if (row.description.trim()) blocks.push(heading('About this course'), ...textToBlocks(row.description));
	const intro = parseYouTubeUrl(row.introVideoUrl);
	if (intro) blocks.push({ type: 'video', href: youtubeWatchUrl(intro) });
	const outcomes = linesOf(row.outcomes);
	if (outcomes.length) blocks.push(heading('What you will learn'), { type: 'list', marker: 'check', items: itemsOf(outcomes) });
	const requirements = linesOf(row.requirements);
	if (requirements.length) blocks.push(heading('Before you start'), { type: 'list', marker: 'bullet', items: itemsOf(requirements) });
	if (presenter) {
		blocks.push(heading('Your instructor'), {
			type: 'paragraph',
			content: [{ kind: 'text', text: presenter.name, style: { bold: true } }, { kind: 'break' }, ...plain(presenter.title)]
		});
	}
	if (curriculum.length) {
		blocks.push(heading('Curriculum'));
		for (const section of curriculum) {
			blocks.push({
				type: 'chapter',
				label: `Section ${section.number} · ${plural(section.lessons.length, 'lesson')}`,
				title: section.title,
				description: textToBlocks(section.description)
			});
			if (section.lessons.length) blocks.push({ type: 'rows', rows: outlineRows(section, scope) });
		}
	}
	if (handouts.length) {
		blocks.push(heading('Handouts'), {
			type: 'list',
			marker: 'bullet',
			items: handouts.map((handout) => [
				{
					type: 'paragraph',
					content: [link(handout.title, siteUrl(handout.href)), ...plain(` (${HANDOUT_STYLE_NAMES[handout.style]}, PDF)`)]
				}
			])
		});
	}
	blocks.push({ type: 'note', content: [...plain('The course online: '), link(courseUrl.replace(/^https?:\/\//, ''), courseUrl)] });

	const bytes = await brandedPdf({
		...base(),
		kind: 'Course outline',
		title: row.name,
		subtitle: row.subtitle || row.shortDescription || null,
		context: row.name,
		facts: [
			plural(curriculum.length, 'section'),
			plural(lessons.length, 'lesson'),
			totalDuration(secondsOf(lessons)) ?? (row.durationMinutes ? totalDuration(row.durationMinutes * 60) : null),
			DIFFICULTY_NAMES[row.difficulty],
			row.language,
			row.accessType === 'FREE' ? 'Free' : null,
			row.certificateEnabled ? 'Certificate on completion' : null
		].filter((fact): fact is string => Boolean(fact)),
		blocks,
		keywords: ['course outline', row.name]
	});
	return { bytes, fileName: fileNameOf(row.name, 'Course outline') };
}

/**
 * One section as a workbook: its lessons, the notes of each lesson the reader can open (with its
 * links and resources), and the section's handouts.
 */
export async function sectionPdf(scope: CourseScope, sectionId: number): Promise<BuiltPdf | null> {
	const row = scope.course;
	const curriculum = await curriculumOf(row.id);
	const section = curriculum.find((item) => item.id === sectionId);
	if (!section) return null;

	const openLessons = section.lessons.filter((item) => scope.staff || canAccessLesson(scope.enrollment, item));
	const openIds = openLessons.map((item) => item.id);
	const [bodies, resources, handouts] = await Promise.all([
		openIds.length
			? db
					.select({ id: lesson.id, content: lesson.content, externalUrl: lesson.externalUrl })
					.from(lesson)
					.where(inArray(lesson.id, openIds))
			: [],
		openIds.length
			? db
					.select({
						id: lessonResource.id,
						lessonId: lessonResource.lessonId,
						title: lessonResource.title,
						url: lessonResource.url,
						file: lessonResource.file
					})
					.from(lessonResource)
					.where(inArray(lessonResource.lessonId, openIds))
					.orderBy(asc(lessonResource.sortOrder), asc(lessonResource.id))
			: [],
		db
			.select()
			.from(courseHandout)
			.where(and(eq(courseHandout.sectionId, section.id), eq(courseHandout.published, true)))
			.orderBy(asc(courseHandout.sortOrder), asc(courseHandout.id))
	]);
	const bodyOf = new Map(bodies.map((body) => [body.id, body]));
	const learnUrl = (lessonId: number) =>
		siteUrl(`/my-courses/${encodeURIComponent(row.slug)}?lesson=${lessonId}`);

	const blocks: DocBlock[] = [...textToBlocks(section.description)];
	if (section.lessons.length) blocks.push(heading('In this section'), { type: 'rows', rows: outlineRows(section, scope) });
	if (openLessons.length < section.lessons.length) {
		const courseUrl = siteUrl(`/courses/${encodeURIComponent(row.slug)}`);
		blocks.push({
			type: 'note',
			content: [
				...plain('Greyed-out lessons open once you are enrolled, and their notes are then part of this workbook. '),
				link('Enroll online', courseUrl)
			]
		});
	}

	section.lessons.forEach((item, index) => {
		if (!openIds.includes(item.id)) return;
		const body = bodyOf.get(item.id);
		blocks.push({ type: 'chapter', label: `Lesson ${section.number}.${index + 1} · ${lessonDetail(item)}`, title: item.title });
		blocks.push(...htmlToBlocks(sanitizeLessonHtml(body?.content)));
		const external = safeHref(body?.externalUrl);
		if (external && item.lessonType === 'EXTERNAL_LINK') {
			blocks.push({ type: 'paragraph', content: [...plain('Open: '), link(external, external)] });
		}
		const mine = resources.filter((resource) => resource.lessonId === item.id);
		const items = mine.flatMap((resource): Block[][] => {
			const href = resource.file ? siteUrl(lessonFileHref(resource.id)) : safeHref(resource.url);
			return href ? [[{ type: 'paragraph', content: [link(resource.title, href)] }]] : [];
		});
		if (items.length) blocks.push(heading('Resources', 4), { type: 'list', marker: 'bullet', items });
		const online =
			item.lessonType === 'VIDEO' ? 'Watch this lesson online' : item.lessonType === 'QUIZ' ? 'Take this quiz online' : 'Open this lesson online';
		blocks.push({ type: 'paragraph', content: [link(online, learnUrl(item.id))] });
	});

	for (const handout of handouts.filter((item) => handoutOpen(item, scope))) {
		blocks.push({
			type: 'chapter',
			label: HANDOUT_STYLE_NAMES[handout.style],
			title: handout.title,
			description: handout.summary ? textToBlocks(handout.summary) : undefined,
			newPage: true
		});
		blocks.push(...handoutBlocks(handout));
	}

	const bytes = await brandedPdf({
		...base(),
		kind: `Section ${section.number} workbook`,
		title: section.title,
		subtitle: row.name,
		context: `${row.name} · Section ${section.number}`,
		facts: [plural(section.lessons.length, 'lesson'), totalDuration(secondsOf(section.lessons))].filter(
			(fact): fact is string => Boolean(fact)
		),
		blocks,
		keywords: ['workbook', row.name, section.title]
	});
	return { bytes, fileName: fileNameOf(row.name, `Section ${section.number}`, section.title) };
}

export type HandoutAccess =
	| { status: 'ok'; pdf: BuiltPdf }
	| { status: 'missing' }
	/** A STUDENTS handout and nobody signed in. */
	| { status: 'sign-in' }
	/** Signed in, but without an active enrollment. */
	| { status: 'forbidden'; courseSlug: string };

/** A handout as a PDF, if this viewer may have it. */
export async function handoutPdf(handoutId: number, viewer: PdfViewer): Promise<HandoutAccess> {
	const [handout] = await db.select().from(courseHandout).where(eq(courseHandout.id, handoutId)).limit(1);
	if (!handout) return { status: 'missing' };
	const [owner] = await db.select({ slug: course.slug }).from(course).where(eq(course.id, handout.courseId)).limit(1);
	const scope = owner ? await courseScope(owner.slug, viewer) : null;
	if (!scope || (!handout.published && !scope.staff)) return { status: 'missing' };
	if (!handoutOpen(handout, scope)) {
		return viewer.userId ? { status: 'forbidden', courseSlug: scope.course.slug } : { status: 'sign-in' };
	}

	const sections = handout.sectionId ? await curriculumOf(scope.course.id) : [];
	const section = sections.find((item) => item.id === handout.sectionId);
	const style = HANDOUT_STYLE_NAMES[handout.style];

	const bytes = await brandedPdf({
		...base(),
		kind: section ? `${style} · Section ${section.number}` : style,
		title: handout.title,
		subtitle: handout.summary || scope.course.name,
		context: scope.course.name,
		facts: [scope.course.name, section ? `Section ${section.number}: ${section.title}` : null].filter(
			(fact): fact is string => Boolean(fact)
		),
		blocks: handoutBlocks(handout),
		keywords: [style.toLowerCase(), scope.course.name]
	});
	return { status: 'ok', pdf: { bytes, fileName: fileNameOf(handout.title) } };
}

/** A PDF download; `inline` opens it in the browser instead (the dashboard's preview). */
export function pdfResponse({ bytes, fileName }: BuiltPdf, inline = false): Response {
	const disposition = attachmentDisposition(fileName);
	return new Response(bytes as Uint8Array<ArrayBuffer>, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Length': String(bytes.byteLength),
			'Content-Disposition': inline ? disposition.replace(/^attachment/, 'inline') : disposition,
			// Access can end (a refund, a revoked enrollment), and a cached copy would outlive it.
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
}

/** Who is asking, from the request's session. */
export function pdfViewer(locals: App.Locals): PdfViewer {
	return {
		userId: locals.user?.id ?? null,
		staff: Boolean(locals.user && (locals.isSuperAdmin || (locals.permList ?? []).includes('courses.manage')))
	};
}
