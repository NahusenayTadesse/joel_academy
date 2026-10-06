import { z } from 'zod';

/** Shared by the contact form (instant feedback) and its form action (the check that counts). */
export const contactSchema = z.object({
	name: z.string().trim().min(2, 'Enter your name').max(120, 'Keep your name under 120 characters'),
	email: z.email('Enter a valid email address').max(255),
	message: z
		.string()
		.trim()
		.min(10, 'Message must be at least 10 characters')
		.max(5000, 'Keep your message under 5,000 characters')
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;
export type ContactErrors = Partial<Record<ContactField, string>>;

/** First message per field, the shape both the client and the action report errors in. */
export function contactErrors(error: z.ZodError): ContactErrors {
	const errors: ContactErrors = {};
	for (const issue of error.issues) {
		const field = issue.path[0] as ContactField;
		errors[field] ??= issue.message;
	}
	return errors;
}
