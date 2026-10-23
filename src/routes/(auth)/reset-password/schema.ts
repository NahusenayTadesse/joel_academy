import { z } from 'zod/v4';
import { m } from '$lib/paraglide/messages';
import { strongPassword } from '../register/schema';

export const resetSchema = z
	.object({
		token: z
			.string()
			.trim()
			.min(20, { error: () => m.account_reset_token_required() }),
		password: strongPassword,
		confirmPassword: z.string()
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ['confirmPassword'],
		error: () => m.account_passwords_mismatch()
	});
