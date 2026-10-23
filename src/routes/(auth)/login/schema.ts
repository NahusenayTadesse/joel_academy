import { z } from 'zod/v4';
import { m } from '$lib/paraglide/messages';

export const loginSchema = z.object({
	email: z.email({ error: () => m.account_error_email_invalid() }),
	password: z.string().min(1, { error: () => m.account_error_password_required() }),
	rememberMe: z.boolean().default(false)
});
