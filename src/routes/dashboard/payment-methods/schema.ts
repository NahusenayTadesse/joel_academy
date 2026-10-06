import { z } from 'zod/v4';
import { idField, optionalText, orderField, requiredText } from '../form-fields';

export const addSchema = z.object({
	name: requiredText(120, 2),
	accountName: requiredText(160),
	accountNumber: requiredText(80),
	instructions: optionalText(3000),
	sortOrder: orderField,
	status: z.boolean().default(true)
});
export const editSchema = addSchema.extend({ id: idField });
