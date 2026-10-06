import { fail } from '@sveltejs/kit';
import { contactErrors, contactSchema } from '$lib/components/info/contact-schema';
import { db } from '$lib/server/db';
import { contactMessage } from '$lib/server/db/schema';
import { contactMessageAdminEmail } from '$lib/server/email';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const values = {
			name: String(formData.get('name') ?? ''),
			email: String(formData.get('email') ?? ''),
			message: String(formData.get('message') ?? '')
		};

		const parsed = contactSchema.safeParse(values);
		if (!parsed.success) return fail(400, { values, errors: contactErrors(parsed.error) });

		// Staff read these in the dashboard inbox.
		await db.insert(contactMessage).values(parsed.data);
		// Started, not awaited: the visitor need not wait on the mail server. It never rejects.
		void contactMessageAdminEmail(parsed.data);
		return { sent: true };
	}
};
