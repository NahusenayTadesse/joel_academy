import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificate } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/student';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const params = event.url.searchParams;
	const search = (params.get('search') ?? '').trim();
	const status = params.get('status') === 'ISSUED' || params.get('status') === 'REVOKED' ? params.get('status')! : 'ALL';
	const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';

	const rows = await db
		.select({
			id: certificate.id,
			code: certificate.code,
			courseTitle: certificate.courseTitle,
			recipientName: certificate.recipientName,
			issuedAt: certificate.issuedAt,
			revokedAt: certificate.revokedAt
		})
		.from(certificate)
		.where(eq(certificate.userId, user.id))
		.orderBy(desc(certificate.issuedAt));

	const needle = search.toLowerCase();
	const items = rows
		.map((row) => ({
			id: row.id,
			code: row.code,
			courseTitle: row.courseTitle,
			recipientName: row.recipientName,
			issuedAt: row.issuedAt.toISOString(),
			status: row.revokedAt ? ('REVOKED' as const) : ('ISSUED' as const)
		}))
		.filter(
			(item) =>
				(status === 'ALL' || item.status === status) &&
				(!needle || item.courseTitle.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle))
		);
	if (sort === 'oldest') items.reverse();

	return { items, total: rows.length, filters: { search, status, sort } };
};
