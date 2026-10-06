import { sanitizeLessonHtml } from '$lib/server/dashboard/sanitize';
import { blankToNull } from '$lib/server/dashboard/values';
import { parseDuration } from '../../form-fields';

/** Lesson form values → lesson columns: duration in seconds, clean HTML, NULL for blanks. */
export function lessonColumns(data: Record<string, unknown>) {
	const { duration, content, id: _id, ...rest } = data;
	void _id;
	const values: Record<string, unknown> = {
		...rest,
		durationSeconds: parseDuration(duration as string | null),
		content: sanitizeLessonHtml(content as string)
	};
	blankToNull(values, ['videoUrl', 'externalUrl']);
	return values;
}
