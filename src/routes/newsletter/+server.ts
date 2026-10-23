import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { newsletterSubscriber } from '$lib/server/db/schema';
import { m } from '$lib/paraglide/messages';
import { clientAddress, hit, waitText } from '$lib/server/spam';
import type { RequestHandler } from './$types';

const body = z.object({
	email: z.string().trim().toLowerCase().max(255).email(),
	/** The honeypot (see $lib/server/spam): people never see it, so it stays empty. */
	website: z.string().optional()
});

const subscribed = () => json({ status: 'subscribed', message: m.misc_newsletter_subscribed() });

/** The footer's sign-up form. Subscribing twice is not an error, just a different message. */
export const POST: RequestHandler = async (event) => {
	const parsed = body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return json({ message: m.misc_newsletter_invalid_email() }, { status: 400 });
	// A bot hears "subscribed" like anyone else; nothing is stored.
	if (parsed.data.website?.trim()) return subscribed();

	const wait = hit('newsletter', clientAddress(event));
	if (wait) return json({ message: m.misc_newsletter_too_many({ wait: waitText(wait) }) }, { status: 429 });

	const [result] = await db
		.insert(newsletterSubscriber)
		.ignore()
		.values({ email: parsed.data.email });
	if (result.affectedRows === 0) {
		return json({ status: 'already_subscribed', message: m.misc_newsletter_already() });
	}
	return subscribed();
};
