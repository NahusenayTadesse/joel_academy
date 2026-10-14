import { z } from 'zod/v4';
import {
	choices,
	durationField,
	idField,
	optionalText,
	optionalUrl,
	orderField,
	requiredText,
	lessonVideoUrl
} from '../../form-fields';

export const LESSON_TYPES = ['VIDEO', 'TEXT', 'DOCUMENT', 'DOWNLOAD', 'EXTERNAL_LINK', 'QUIZ'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const LESSON_TYPE_NAMES: Record<LessonType, string> = {
	VIDEO: 'Video',
	TEXT: 'Reading',
	DOCUMENT: 'Document',
	DOWNLOAD: 'Download',
	EXTERNAL_LINK: 'External link',
	QUIZ: 'Quiz'
};
export const lessonTypeChoices = choices(LESSON_TYPES, LESSON_TYPE_NAMES);

export const sectionSchema = z.object({
	title: requiredText(180),
	description: optionalText(2000)
});
export const sectionEditSchema = sectionSchema.extend({ id: idField });

const lessonFields = z.object({
	sectionId: idField,
	title: requiredText(200),
	lessonType: z.enum(LESSON_TYPES).default('VIDEO'),
	duration: durationField,
	isPreview: z.boolean().default(false),
	isMandatory: z.boolean().default(true),
	videoUrl: lessonVideoUrl,
	externalUrl: optionalUrl,
	// HTML from the kit's RichEditor; sanitised on the server before it is stored.
	content: z.string().max(200_000, 'Too long').default('')
});

/** What each lesson type needs before students can use it. */
function lessonRules(
	value: { lessonType: LessonType; externalUrl?: string | null },
	ctx: z.RefinementCtx
) {
	if (value.lessonType === 'EXTERNAL_LINK' && !value.externalUrl) {
		ctx.addIssue({
			code: 'custom',
			path: ['externalUrl'],
			message: 'An external-link lesson needs its link'
		});
	}
}

export const lessonSchema = lessonFields.superRefine(lessonRules);
export const lessonEditSchema = lessonFields.extend({ id: idField }).superRefine(lessonRules);

/**
 * A lesson resource is a link or an uploaded file. The file itself posts beside these fields (a
 * plain `file` input) and is checked on the server, in `$lib/server/lesson-files`.
 */
export const RESOURCE_KINDS = ['LINK', 'FILE'] as const;

const resourceFields = z.object({
	title: requiredText(200),
	kind: z.enum(RESOURCE_KINDS).default('LINK'),
	url: optionalUrl,
	sortOrder: orderField
});

function resourceRules(value: { kind: (typeof RESOURCE_KINDS)[number]; url?: string | null }, ctx: z.RefinementCtx) {
	if (value.kind === 'LINK' && !value.url) {
		ctx.addIssue({ code: 'custom', path: ['url'], message: 'Enter the link, starting with https://' });
	}
}

export const resourceSchema = resourceFields.superRefine(resourceRules);
export const resourceEditSchema = resourceFields.extend({ id: idField }).superRefine(resourceRules);

export const moveSchema = z.object({
	id: idField,
	direction: z.enum(['up', 'down'])
});

export const QUIZ_MAX_OPTIONS = 10;

/**
 * A quiz question as the builder posts it: option texts in order (`options`, one input each) and
 * the indexes of the correct ones (`correct`, one checkbox each). Blank options are dropped, so
 * the checks below count only options that have text.
 */
const questionFields = z.object({
	prompt: requiredText(2000),
	explanation: optionalText(2000),
	options: z.array(z.string().trim().max(500, 'At most 500 characters')).default(['', '', '', '']),
	correct: z.array(z.coerce.number().int().min(0)).default([])
});

function questionRules(value: { options: string[]; correct: number[] }, ctx: z.RefinementCtx) {
	const filled = value.options.map((text, index) => ({ text, index })).filter((option) => option.text);
	if (filled.length < 2) {
		ctx.addIssue({ code: 'custom', path: ['options'], message: 'Give at least two answer options' });
	}
	if (filled.length > QUIZ_MAX_OPTIONS) {
		ctx.addIssue({ code: 'custom', path: ['options'], message: `At most ${QUIZ_MAX_OPTIONS} options` });
	}
	if (!filled.some((option) => value.correct.includes(option.index))) {
		ctx.addIssue({ code: 'custom', path: ['correct'], message: 'Mark at least one option as correct' });
	}
}

export const questionSchema = questionFields.superRefine(questionRules);
export const questionEditSchema = questionFields.extend({ id: idField }).superRefine(questionRules);

/** The pass mark in percent; blank keeps the default (70). */
export const passingScoreSchema = z.object({
	passingScore: z
		.number()
		.int('A whole number')
		.min(1, 'Between 1 and 100')
		.max(100, 'Between 1 and 100')
		.nullable()
		.default(null)
});

/** Builder values → what `saveQuestion` stores: blank options dropped, correct indexes remapped. */
export function questionInput(data: { prompt: string; explanation?: string | null; options: string[]; correct: number[] }) {
	const kept = data.options.map((text, index) => ({ text, index })).filter((option) => option.text);
	return {
		prompt: data.prompt,
		explanation: data.explanation ?? null,
		options: kept.map((option) => option.text),
		correct: kept.flatMap((option, position) => (data.correct.includes(option.index) ? [position] : []))
	};
}
