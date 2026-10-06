import { z } from 'zod/v4';
import { idField, optionalText, orderField, requiredText, slugField } from '../form-fields';

export const addSchema = z.object({
	name: requiredText(120, 2),
	slug: slugField,
	description: optionalText(2000),
	sortOrder: orderField,
	status: z.boolean().default(true)
});
export const editSchema = addSchema.extend({ id: idField });
