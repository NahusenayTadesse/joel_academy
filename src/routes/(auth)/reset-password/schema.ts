import { z } from 'zod/v4';
import { strongPassword } from '../register/schema';

export const resetSchema = z
	.object({
		token: z.string().trim().min(20, 'Paste the token from your reset email'),
		password: strongPassword,
		confirmPassword: z.string()
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ['confirmPassword'],
		message: 'Passwords do not match'
	});
