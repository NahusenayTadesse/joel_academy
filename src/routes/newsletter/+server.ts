import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { newsletterSubscriber } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const body = z.object({ email: z.string().trim().toLowerCase().max(255).email() });

/** The footer's sign-up form. Subscribing twice is not an error, just a different message. */
export const POST: RequestHandler = async ({ request }) => {
	const parsed = body.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return json({ message: 'Please enter a valid email address.' }, { status: 400 });

	const [result] = await db
		.insert(newsletterSubscriber)
		.ignore()
		.values({ email: parsed.data.email });
	if (result.affectedRows === 0) {
		return json({ status: 'already_subscribed', message: 'This email is already on our list.' });
	}
	return json({ status: 'subscribed', message: "We'll email you when new courses launch." });
};
