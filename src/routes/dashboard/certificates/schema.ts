import { z } from 'zod/v4';
import { idField, requiredText } from '../form-fields';

export const revokeSchema = z.object({
	id: idField,
	reason: requiredText(500, 5)
});
export const issueSchema = z.object({
	enrollmentId: z.number().int().positive('Pick a student and course')
});
