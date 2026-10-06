import { z } from 'zod/v4';

export const verifySchema = z.object({
	token: z.string().trim().min(20, 'Paste the token from your confirmation email')
});
