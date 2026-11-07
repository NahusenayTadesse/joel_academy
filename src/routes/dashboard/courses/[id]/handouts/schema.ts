import { z } from 'zod/v4';
import { choices, idField, optionalReference, optionalText, requiredText } from '../../../form-fields';

export const HANDOUT_STYLES = ['DOCUMENT', 'CHECKLIST', 'WORKSHEET'] as const;
export const HANDOUT_AUDIENCES = ['STUDENTS', 'PUBLIC'] as const;

export const HANDOUT_STYLE_HINTS: Record<(typeof HANDOUT_STYLES)[number], string> = {
	DOCUMENT: 'Handout: notes, a reference sheet, a reading',
	CHECKLIST: 'Checklist: every list prints with tick boxes',
	WORKSHEET: 'Worksheet: name and date fields, answer lines under each list item'
};
export const handoutStyleChoices = choices(HANDOUT_STYLES, HANDOUT_STYLE_HINTS);

export const HANDOUT_AUDIENCE_NAMES: Record<(typeof HANDOUT_AUDIENCES)[number], string> = {
	STUDENTS: 'Enrolled students',
	PUBLIC: 'Everyone (also listed on the course page)'
};
export const handoutAudienceChoices = choices(HANDOUT_AUDIENCES, HANDOUT_AUDIENCE_NAMES);

const handoutFields = z.object({
	title: requiredText(200),
	summary: optionalText(500),
	/** Empty for the whole course. */
	sectionId: optionalReference,
	style: z.enum(HANDOUT_STYLES).default('DOCUMENT'),
	audience: z.enum(HANDOUT_AUDIENCES).default('STUDENTS')
});

export const handoutSchema = handoutFields;

export const handoutEditSchema = handoutFields.extend({
	id: idField,
	published: z.boolean().default(false),
	// HTML from the kit's RichEditor; sanitised on the server before it is stored.
	content: z.string().max(200_000, 'Too long').default('')
});
