import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { emailLog } from '$lib/server/db/schema';
import { emailLinks, previewDocument } from '../preview';
import type { RequestHandler } from './$types';

/** One logged email for the preview dialog. Admin-only through the `/dashboard/emails` rule. */
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'No such email');
	const [row] = await db.select({ html: emailLog.html }).from(emailLog).where(eq(emailLog.id, id));
	if (!row) error(404, 'No such email');
	// Holds live reset and sign-in links: never cache it.
	setHeaders({ 'cache-control': 'no-store' });
	return json({ document: previewDocument(row.html), links: emailLinks(row.html) });
};
