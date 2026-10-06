import { z } from 'zod/v4';
import { idField, requiredText } from '../form-fields';

export const rejectSchema = z.object({
	id: idField,
	reason: requiredText(500, 5)
});

export const enrollSchema = z.object({
	email: z.email('Enter the email the student signed up with').trim(),
	courseId: z.number().int().positive('Pick a course')
});
