import { z } from 'zod/v4';

export const forgotSchema = z.object({
	email: z.email('Enter a valid email address')
});
