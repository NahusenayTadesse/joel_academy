/*
 * Lesson files, the parts both the dashboard form and the learning page need. The checks and the
 * storage are on the server, in `$lib/server/lesson-files`.
 */

/** The extensions a lesson file may have; the server's table of types is keyed by these. */
export const LESSON_FILE_EXTENSIONS = [
	'pdf',
	'png',
	'jpg',
	'jpeg',
	'webp',
	'zip',
	'docx',
	'xlsx',
	'pptx',
	'mp3',
	'txt',
	'csv'
] as const;

/** The upload input's `accept` list. */
export const LESSON_FILE_ACCEPT = LESSON_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Where a student downloads a resource's file; the stored name is never in a page. */
export const lessonFileHref = (resourceId: number) => `/lesson-files/${resourceId}`;

/** "820 KB", "2.4 MB". */
export function formatFileSize(bytes: number | null | undefined): string {
	if (!bytes || bytes < 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '')} MB`;
}
