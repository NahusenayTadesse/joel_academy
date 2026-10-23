import { z } from 'zod/v4';
import { m } from '$lib/paraglide/messages';
import { normalizeEthPhone } from '$lib/phone';

/* The original's rules: a real name and a strong password, confirmed. */
export const strongPassword = z
	.string()
	.min(8, { error: () => m.account_password_min() })
	.max(128, { error: () => m.account_password_max() })
	.regex(/[A-Z]/, { error: () => m.account_password_upper() })
	.regex(/[a-z]/, { error: () => m.account_password_lower() })
	.regex(/\d/, { error: () => m.account_password_number() })
	.regex(/[^A-Za-z\d]/, { error: () => m.account_password_symbol() });

export const registerSchema = z
	.object({
		firstName: z
			.string()
			.trim()
			.min(2, { error: () => m.account_first_name_required() })
			.max(60),
		lastName: z
			.string()
			.trim()
			.min(2, { error: () => m.account_last_name_required() })
			.max(60),
		email: z.email({ error: () => m.account_error_email_invalid() }),
		/** Optional: verified by a texted code after sign-up, then used for SMS updates. */
		phone: z
			.string()
			.trim()
			.max(30)
			.refine((value) => !value || normalizeEthPhone(value), { error: () => m.account_phone_invalid_field() })
			.default(''),
		password: strongPassword,
		confirmPassword: z.string()
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ['confirmPassword'],
		error: () => m.account_passwords_mismatch()
	});
