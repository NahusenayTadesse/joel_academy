import { fail } from '@sveltejs/kit';
import { contactErrors, contactSchema } from '$lib/components/info/contact-schema';
import { db } from '$lib/server/db';
import { contactMessage } from '$lib/server/db/schema';
import { contactMessageAdminEmail } from '$lib/server/email';
import { m } from '$lib/paraglide/messages';
import { clientAddress, hit, issueFormToken, judgeSubmission, waitText } from '$lib/server/spam';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ formToken: issueFormToken() });

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const values = {
			name: String(formData.get('name') ?? ''),
			email: String(formData.get('email') ?? ''),
			message: String(formData.get('message') ?? '')
		};

		// A bot gets the same answer as a person, so it learns nothing; nothing is stored or sent.
		const verdict = judgeSubmission(formData);
		if (verdict === 'honeypot' || verdict === 'too-fast') return { sent: true };
		if (verdict === 'bad-token') {
			return fail(400, { values, errors: {}, message: m.info_contact_form_expired() });
		}

		const parsed = contactSchema.safeParse(values);
		if (!parsed.success) return fail(400, { values, errors: contactErrors(parsed.error) });

		const wait = hit('contact', clientAddress(event));
		if (wait) {
			return fail(429, { values, errors: {}, message: m.info_contact_rate_limited({ wait: waitText(wait) }) });
		}

		// Staff read these in the dashboard inbox.
		await db.insert(contactMessage).values(parsed.data);
		// Started, not awaited: the visitor need not wait on the mail server. It never rejects.
		void contactMessageAdminEmail(parsed.data);
		return { sent: true };
	}
};
