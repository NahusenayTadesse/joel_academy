import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { courseHandout, type HANDOUT_STYLES } from '$lib/server/db/schema';
import { DOWNLOADS } from '$lib/downloads';

export interface HandoutLink {
	id: number;
	title: string;
	style: (typeof HANDOUT_STYLES)[number];
	sectionId: number | null;
	href: string;
}

/**
 * The published handouts a reader of the course can download, in their order. `full` is an
 * active enrollment; without one only PUBLIC handouts are listed.
 */
export async function handoutLinks(courseId: number, full: boolean): Promise<HandoutLink[]> {
	const rows = await db
		.select({
			id: courseHandout.id,
			title: courseHandout.title,
			style: courseHandout.style,
			sectionId: courseHandout.sectionId,
			audience: courseHandout.audience
		})
		.from(courseHandout)
		.where(and(eq(courseHandout.courseId, courseId), eq(courseHandout.published, true)))
		.orderBy(asc(courseHandout.sortOrder), asc(courseHandout.id));
	return rows
		.filter((row) => full || row.audience === 'PUBLIC')
		.map(({ audience: _audience, ...row }) => ({ ...row, href: DOWNLOADS.handout(row.id) }));
}
