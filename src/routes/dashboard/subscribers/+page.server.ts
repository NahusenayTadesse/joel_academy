import { desc, eq } from 'drizzle-orm';
import { requireSuperAdmin } from '@nahu/admin-kit/server/permissions';
import { db } from '$lib/server/db';
import { newsletterSubscriber } from '$lib/server/db/schema';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	rows: await db
		.select()
		.from(newsletterSubscriber)
		.orderBy(desc(newsletterSubscriber.createdAt), desc(newsletterSubscriber.id))
});

export const actions: Actions = {
	// A hard delete: an unsubscribed address should not linger in the list.
	delete: async ({ request, locals, cookies }) => {
		requireSuperAdmin(locals);
		const id = postedId(await request.formData());
		const [result] = await db.delete(newsletterSubscriber).where(eq(newsletterSubscriber.id, id));
		return result.affectedRows
			? flashOk(cookies, 'Subscriber removed.')
			: flashFail(cookies, 'That subscriber is already gone.', 404);
	}
};
