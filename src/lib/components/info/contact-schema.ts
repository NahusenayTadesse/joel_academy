import { z } from 'zod';
import { m } from '$lib/paraglide/messages';

/** Shared by the contact form (instant feedback) and its form action (the check that counts). */
export const contactSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, { error: () => m.info_contact_name_required() })
		.max(120, { error: () => m.info_contact_name_too_long() }),
	email: z.email({ error: () => m.info_contact_email_invalid() }).max(255),
	message: z
		.string()
		.trim()
		.min(10, { error: () => m.info_contact_message_too_short() })
		.max(5000, { error: () => m.info_contact_message_too_long() })
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
