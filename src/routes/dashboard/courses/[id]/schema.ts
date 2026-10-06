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

export const LESSON_TYPES = ['VIDEO', 'TEXT', 'DOCUMENT', 'DOWNLOAD', 'EXTERNAL_LINK'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const LESSON_TYPE_NAMES: Record<LessonType, string> = {
	VIDEO: 'Video',
	TEXT: 'Reading',
	DOCUMENT: 'Document',
	DOWNLOAD: 'Download',
	EXTERNAL_LINK: 'External link'
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

export const resourceSchema = z.object({
	title: requiredText(200),
	url: requiredText(500).refine(
		(value) => /^https?:\/\//i.test(value) && URL.canParse(value),
		'Enter a full link, starting with https://'
	),
	sortOrder: orderField
});
export const resourceEditSchema = resourceSchema.extend({ id: idField });

export const moveSchema = z.object({
	id: idField,
	direction: z.enum(['up', 'down'])
});
