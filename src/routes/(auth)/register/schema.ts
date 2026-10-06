import { z } from 'zod/v4';
import { normalizeEthPhone } from '$lib/phone';

/* The original's rules: a real name and a strong password, confirmed. */
export const strongPassword = z
	.string()
	.min(8, 'Use at least 8 characters')
	.max(128, 'Use at most 128 characters')
	.regex(/[A-Z]/, 'Include an uppercase letter')
	.regex(/[a-z]/, 'Include a lowercase letter')
	.regex(/\d/, 'Include a number')
	.regex(/[^A-Za-z\d]/, 'Include a symbol');

export const registerSchema = z
	.object({
		firstName: z.string().trim().min(2, 'Enter your first name').max(60),
		lastName: z.string().trim().min(2, 'Enter your last name').max(60),
		email: z.email('Enter a valid email address'),
		/** Optional: verified by a texted code after sign-up, then used for SMS updates. */
		phone: z
			.string()
			.trim()
			.max(30)
			.refine((value) => !value || normalizeEthPhone(value), 'Enter an Ethiopian mobile number, like 0912 345 678')
			.default(''),
		password: strongPassword,
		confirmPassword: z.string()
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ['confirmPassword'],
		message: 'Passwords do not match'
	});
