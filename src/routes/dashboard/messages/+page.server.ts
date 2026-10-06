import { desc, eq, sql } from 'drizzle-orm';
import { requireSuperAdmin } from '@nahu/admin-kit/server/permissions';
import { db } from '$lib/server/db';
import { contactMessage } from '$lib/server/db/schema';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import type { Actions, PageServerLoad } from './$types';

const STATUSES = ['NEW', 'READ'] as const;
type Status = (typeof STATUSES)[number];

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('status');
	const status = STATUSES.find((s) => s === param);

	const [rows, counts] = await Promise.all([
		db
			.select()
			.from(contactMessage)
			.where(status ? eq(contactMessage.status, status) : undefined)
			.orderBy(desc(contactMessage.createdAt), desc(contactMessage.id)),
		db
			.select({ status: contactMessage.status, total: sql<number>`count(*)` })
			.from(contactMessage)
			.groupBy(contactMessage.status)
	]);
	const tally = { NEW: 0, READ: 0 };
	for (const row of counts) tally[row.status] = Number(row.total);

	return { status: status ?? null, counts: tally, rows };
};

export const actions: Actions = {
	/** Marks read or unread: `status` is posted with the id. */
	mark: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = postedId(data);
		const status = STATUSES.find((s) => s === data.get('status')) as Status | undefined;
		if (!id || !status) return flashFail(cookies, 'Nothing to mark.');
		await db.update(contactMessage).set({ status }).where(eq(contactMessage.id, id));
		return { ok: true };
	},

	delete: async ({ request, locals, cookies }) => {
		requireSuperAdmin(locals);
		const id = postedId(await request.formData());
		const [result] = await db.delete(contactMessage).where(eq(contactMessage.id, id));
		return result.affectedRows
			? flashOk(cookies, 'Message deleted.')
			: flashFail(cookies, 'That message is already gone.', 404);
	}
};
