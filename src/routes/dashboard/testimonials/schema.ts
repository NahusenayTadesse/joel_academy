import { z } from 'zod/v4';
import { idField, orderField, requiredText } from '../form-fields';

export const addSchema = z.object({
	studentName: requiredText(120, 2),
	role: z.string().trim().max(160).nullish(),
	courseTitle: z.string().trim().max(180).nullish(),
	rating: z.coerce.number().int().min(1, '1 to 5').max(5, '1 to 5').default(5),
	quote: requiredText(2000, 10),
	sortOrder: orderField,
	status: z.boolean().default(true)
});
export const editSchema = addSchema.extend({ id: idField });
