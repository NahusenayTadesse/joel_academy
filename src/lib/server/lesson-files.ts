import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { and, eq } from 'drizzle-orm';
import {
	FILES_DIR,
	generateFileName,
	MAX_UPLOAD_BYTES,
	resolveStoredFile,
	saveUploadedFile,
	UploadRefused
} from '@nahu/admin-kit/server/files';
import { db } from '$lib/server/db';
import { course, enrollment, lesson, lessonResource } from '$lib/server/db/schema';
import { canAccessLesson } from '$lib/server/enrollment';
import type { LESSON_FILE_EXTENSIONS } from '$lib/lesson-files';

/*
 * Files attached to a lesson (slides, worksheets, audio). Unlike the kit's dashboard uploads they
 * are served to students, through `/lesson-files/[resourceId]`, and only to those who may open the
 * lesson. The stored name never leaves the server: students get the resource id and the original
 * filename, which is what the download is saved as.
 */

/** Each extension a lesson file may have, with the type it is served as and the types a browser may declare for it. */
const LESSON_FILE_TYPES: Record<(typeof LESSON_FILE_EXTENSIONS)[number], { mime: string; declared: string[]; magic?: number[][] }> = {
	pdf: { mime: 'application/pdf', declared: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
	png: { mime: 'image/png', declared: ['image/png'], magic: [[0x89, 0x50, 0x4e, 0x47]] },
	jpg: { mime: 'image/jpeg', declared: ['image/jpeg', 'image/pjpeg'], magic: [[0xff, 0xd8, 0xff]] },
	jpeg: { mime: 'image/jpeg', declared: ['image/jpeg', 'image/pjpeg'], magic: [[0xff, 0xd8, 0xff]] },
	webp: { mime: 'image/webp', declared: ['image/webp'], magic: [[0x52, 0x49, 0x46, 0x46]] },
	zip: {
		mime: 'application/zip',
		declared: ['application/zip', 'application/x-zip-compressed', 'application/x-zip'],
		magic: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]]
	},
	docx: {
		mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		declared: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
		magic: [[0x50, 0x4b, 0x03, 0x04]]
	},
	xlsx: {
		mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		declared: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
		magic: [[0x50, 0x4b, 0x03, 0x04]]
	},
	pptx: {
		mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		declared: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
		magic: [[0x50, 0x4b, 0x03, 0x04]]
	},
	mp3: {
		mime: 'audio/mpeg',
		declared: ['audio/mpeg', 'audio/mp3'],
		// An ID3 tag, or straight into an MPEG frame.
		magic: [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xfa], [0xff, 0xf3], [0xff, 0xf2]]
	},
	txt: { mime: 'text/plain', declared: ['text/plain'] },
	// Windows browsers report a .csv as Excel's.
	csv: { mime: 'text/csv', declared: ['text/csv', 'application/vnd.ms-excel', 'text/plain'] }
};

/** Types the kit's own store accepts, so those go through `saveUploadedFile` unchanged. */
const KIT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'text/plain', 'text/csv']);

/** The type entry for a filename's extension; own keys only, so `x.constructor` is no type. */
const typeOf = (name: string) => {
	const ext = extensionOf(name);
	return Object.hasOwn(LESSON_FILE_TYPES, ext) ? LESSON_FILE_TYPES[ext as keyof typeof LESSON_FILE_TYPES] : undefined;
};

const extensionOf = (name: string) => {
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/**
 * The name a download is saved as: the uploader's filename without any folder part or control
 * characters, at most 200 characters with its extension kept.
 */
export function cleanFileName(name: string): string {
	const base = (name.split(/[\\/]/).pop() ?? '')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f\u007f]/g, '')
		.trim();
	if (!base || base === '.' || base === '..') return 'download';
	if (base.length <= 200) return base;
	const ext = extensionOf(base);
	const keep = ext && ext.length < 12 ? `.${ext}` : '';
	return base.slice(0, 200 - keep.length) + keep;
}

/**
 * Why a file may not be attached to a lesson, or `null` when it may. The extension, the type the
 * browser declared and the file's first bytes must all agree, since the first two are only what
 * the uploader's computer claims.
 */
export function lessonFileProblem(
	file: { name: string; type: string; size: number },
	head?: Uint8Array
): string | null {
	if (file.size <= 0) return 'Choose a file to upload.';
	if (file.size > MAX_UPLOAD_BYTES)
		return `That file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
	const kind = typeOf(file.name);
	const allowed = 'PDF, images, ZIP, Word, Excel, PowerPoint, MP3, text or CSV';
	if (!kind) return `That kind of file cannot be attached. Use ${allowed}.`;
	if (!kind.declared.includes(file.type.toLowerCase()))
		return `The file's type does not match its name. Use ${allowed}.`;
	if (head && kind.magic && !kind.magic.some((sig) => sig.every((byte, index) => head[index] === byte)))
		return 'The file’s contents do not match its name.';
	return null;
}

export interface StoredLessonFile {
	file: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
}

/** Checks and stores an uploaded lesson file. Throws `UploadRefused` with a reason staff can act on. */
export async function storeLessonFile(upload: File): Promise<StoredLessonFile> {
	const head = new Uint8Array(await upload.slice(0, 8).arrayBuffer());
	const problem = lessonFileProblem(upload, head);
	if (problem) throw new UploadRefused(problem, 'file');

	const ext = extensionOf(upload.name);
	const mimeType = typeOf(upload.name)!.mime;
	let stored: string;
	if (KIT_TYPES.has(mimeType)) {
		// Re-typed to the canonical type, so `audio/mp3` and friends are what the kit expects.
		stored = await saveUploadedFile(new File([upload], upload.name, { type: mimeType }));
	} else {
		// Office documents and archives are outside the kit's list (it serves its files inline);
		// they are written the same way, under the same unguessable kind of name.
		stored = `${generateFileName()}.${ext}`;
		await pipeline(
			Readable.fromWeb(upload.stream() as Parameters<typeof Readable.fromWeb>[0]),
			fs.createWriteStream(path.join(FILES_DIR, stored))
		);
	}
	return { file: stored, fileName: cleanFileName(upload.name), fileSize: upload.size, mimeType };
}

/** Deletes a stored lesson file; a file already gone is not an error. */
export async function removeLessonFile(name: string | null | undefined) {
	if (!name) return;
	const target = resolveStoredFile(name);
	if (target) await fs.promises.unlink(target).catch(() => {});
}

/** RFC 5987 `ext-value` encoding: percent-encoded UTF-8, including the characters it reserves. */
const encodeRfc5987 = (value: string) =>
	encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * `Content-Disposition` for a download saved as `fileName`: a plain-ASCII `filename` for old
 * clients and the exact name as `filename*` (RFC 6266 / 5987) for everyone else.
 */
export function attachmentDisposition(fileName: string): string {
	const name = cleanFileName(fileName);
	const ascii =
		name
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^\x20-\x7e]+/g, '_')
			.replace(/["\\%]/g, '_')
			.trim() || 'download';
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(name)}`;
}

/** Who is asking for a lesson file. */
export interface FileViewer {
	userId: string;
	/** Staff who edit courses may download any lesson's files. */
	staff: boolean;
}

/**
 * The stored file behind a resource, when `viewer` may download it: staff, or a student who may
 * open the lesson (an ACTIVE enrollment, or a preview lesson of a course they can see). `null`
 * for anything else — no such resource, no file, or no access — so the route answers the same 404.
 */
export async function lessonFileFor(resourceId: number, viewer: FileViewer) {
	const [row] = await db
		.select({
			file: lessonResource.file,
			fileName: lessonResource.fileName,
			mimeType: lessonResource.mimeType,
			isPreview: lesson.isPreview,
			courseId: course.id,
			published: course.status
		})
		.from(lessonResource)
		.innerJoin(lesson, eq(lesson.id, lessonResource.lessonId))
		.innerJoin(course, eq(course.id, lesson.courseId))
		.where(eq(lessonResource.id, resourceId))
		.limit(1);
	if (!row?.file) return null;
	const found = { file: row.file, fileName: row.fileName || 'download', mimeType: row.mimeType || 'application/octet-stream' };
	if (viewer.staff) return found;

	const [current] = await db
		.select({ status: enrollment.status })
		.from(enrollment)
		.where(and(eq(enrollment.userId, viewer.userId), eq(enrollment.courseId, row.courseId)))
		.limit(1);
	// An unpublished course stays open to the students already on it, as on the learning page.
	if (!row.published && !current) return null;
	return canAccessLesson(current, { isPreview: row.isPreview }) ? found : null;
}
