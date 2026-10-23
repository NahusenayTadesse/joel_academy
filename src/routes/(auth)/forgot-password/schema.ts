import { z } from 'zod/v4';
import { m } from '$lib/paraglide/messages';

export const forgotSchema = z.object({
	email: z.email({ error: () => m.account_error_email_invalid() })
});
