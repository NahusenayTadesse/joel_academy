import { z } from 'zod/v4';
import { m } from '$lib/paraglide/messages';

export const verifySchema = z.object({
	token: z
		.string()
		.trim()
		.min(20, { error: () => m.account_verify_token_required() })
});
