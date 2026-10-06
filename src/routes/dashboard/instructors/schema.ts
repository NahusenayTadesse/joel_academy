import { z } from 'zod/v4';
import {
	idField,
	imageFile,
	optionalText,
	orderField,
	requiredText,
	slugField
} from '../form-fields';

export const addSchema = z.object({
	name: requiredText(120, 2),
	slug: slugField,
	title: requiredText(180).default('Academy Instructor'),
	bio: optionalText(5000),
	photo: imageFile.optional(),
	skills: optionalText(3000),
	achievements: optionalText(3000),
	sortOrder: orderField,
	status: z.boolean().default(true)
});
export const editSchema = addSchema.extend({ id: idField });
