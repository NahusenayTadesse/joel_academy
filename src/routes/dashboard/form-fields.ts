import { z } from 'zod/v4';
import { isUsableYouTubeUrl } from '@nahu/admin-kit/youtube';
import { LESSON_VIDEO_HINT, parseLessonVideo } from '$lib/video';

/*
 * Pieces the dashboard's form schemas share. Here rather than in `$lib/server` because the forms
 * validate in the browser too.
 */

/** A text the form must have. */
export const requiredText = (max: number, min = 1) =>
	z
		.string()
		.trim()
		.min(min, min === 1 ? 'Required' : `At least ${min} characters`)
		.max(max, `At most ${max} characters`);

/**
 * A text that may be left empty. `nullish`, not `optional`: the kit's edit dialog seeds each field
 * straight from the row, so a NULL column arrives as `null`, and a schema that refused it blocked
 * the save with an error under that field.
 */
export const optionalText = (max: number) =>
	z.string().trim().max(max, `At most ${max} characters`).nullish();

/** Display order, the kit's own convention (`sortOrderField`). */
export const orderField = z.coerce.number().int().min(0, 'Zero or more').default(0);

export const idField = z.coerce.number().int().positive();

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A URL slug, or blank to have the server build one from the name. */
export const slugField = z
	.string()
	.trim()
	.max(180)
	.refine((value) => value === '' || SLUG.test(value), 'Use lowercase words separated by hyphens')
	.nullish();

/** "Intro to AI: Part 1" → "intro-to-ai-part-1". */
export function slugify(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 180);
}

/** A full http(s) link, or nothing. */
export const optionalUrl = z
	.string()
	.trim()
	.max(500)
	.refine(
		(value) => value === '' || (/^https?:\/\//i.test(value) && URL.canParse(value)),
		'Enter a full link, starting with https://'
	)
	.nullish();

/**
 * A lesson video: a YouTube, Vimeo or Bunny Stream link, or a direct https video file — the link
 * itself, never an embed snippet.
 */
export const lessonVideoUrl = z
	.string()
	.trim()
	.max(500)
	.refine((value) => value === '' || parseLessonVideo(value) !== null, LESSON_VIDEO_HINT)
	.nullish();

/**
 * A YouTube video: the link from the address bar or the Share button, read by the kit's
 * `parseYouTubeUrl`. Never the `<iframe>` snippet: the site draws its own player.
 */
export const youtubeUrl = z
	.string()
	.trim()
	.max(500)
	.refine(
		(value) => value === '' || isUsableYouTubeUrl(value),
		'Paste the YouTube link from the address bar or Share, like https://youtu.be/…'
	)
	.nullish();

/** One stored image, under the kit's upload limit. */
export const imageFile = z
	.file()
	.max(10_000_000, 'At most 10 MB')
	.refine((file) => file.type.startsWith('image/'), 'An image, not a document');

/** A nullable foreign key from a `reference` picker; an empty picker posts '' (→ null). */
export const optionalReference = z.number().int().positive().nullable().default(null);

/** `{ value, name }` choices for a `select` field, from a fixed list of stored values. */
export const choices = <T extends string>(values: readonly T[], names: Record<T, string>) =>
	values.map((value) => ({ value, name: names[value] }));

/** An amount as a decimal column wants it. */
export const money = (value: number | null | undefined) =>
	value === null || value === undefined ? null : Number(value).toFixed(2);

const DURATION = /^(?:(\d+):)?(\d{1,3}):(\d{2})$|^(\d+)$/;

/** A lesson's length as typed: "12:30", "1:05:00", or a plain number of minutes. */
export const durationField = z
	.string()
	.trim()
	.refine((value) => value === '' || DURATION.test(value), 'Use minutes:seconds, like 12:30')
	.nullish();

/** "12:30" → 750 seconds; blank → null. */
export function parseDuration(value: string | null | undefined): number | null {
	const match = value?.trim().match(DURATION);
	if (!match) return null;
	const [, hours, minutes, seconds, plainMinutes] = match;
	if (plainMinutes !== undefined) return Number(plainMinutes) * 60;
	return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds);
}

/** 750 → "12:30"; 3900 → "1:05:00"; null → "". */
export function formatDuration(seconds: number | null | undefined): string {
	if (!seconds || seconds <= 0) return '';
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
