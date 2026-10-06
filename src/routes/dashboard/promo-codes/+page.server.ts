import { asc, eq } from 'drizzle-orm';
import { contentCrud } from '@nahu/admin-kit/server/crud';
import { lookupDeleteAction } from '@nahu/admin-kit/server/lookupDelete';
import { localDate } from '@nahu/admin-kit/time';
import { db } from '$lib/server/db';
import { course, promoCode } from '$lib/server/db/schema';
import { blankToNull } from '$lib/server/dashboard/values';
import { redemptionCounts } from '$lib/server/promo';
import { normalizePromoCode } from '$lib/promo';
import { money } from '../form-fields';
import { addSchema, editSchema } from './schema';
import type { PageServerLoad } from './$types';

/** Only paid courses take a code; a free one has nothing to discount. */
const paidCourseOptions = () =>
	db
		.select({ value: course.id, name: course.name })
		.from(course)
		.where(eq(course.accessType, 'PAID'))
		.orderBy(asc(course.name));

/* Dates are picked as days in Addis Ababa: a code runs from the start of its first day to the end of its last. */
const ADDIS = '+03:00';
const dayStart = (date: unknown) => (typeof date === 'string' && date ? new Date(`${date}T00:00:00${ADDIS}`) : null);
const dayEnd = (date: unknown) => (typeof date === 'string' && date ? new Date(`${date}T23:59:59.999${ADDIS}`) : null);

const crud = contentCrud({
	table: promoCode,
	label: 'Promo code',
	addSchema,
	editSchema,
	uniqueField: 'code',
	// Not the kit's `references`: its join filters the referenced table on `deletedAt`, which
	// `course` does not have, so the picker and the names are loaded below instead.
	transform: (values) => {
		values.code = normalizePromoCode(values.code);
		values.discountValue = money(values.discountValue);
		values.startsAt = dayStart(values.startsAt);
		values.endsAt = dayEnd(values.endsAt);
		return blankToNull(values, ['description']);
	}
});

function stateOf(row: typeof promoCode.$inferSelect, redeemed: number, now: Date) {
	if (!row.status) return 'Off';
	if (row.startsAt && row.startsAt > now) return 'Scheduled';
	if (row.endsAt && row.endsAt < now) return 'Expired';
	if (row.maxRedemptions !== null && redeemed >= row.maxRedemptions) return 'Used up';
	return 'Live';
}

export const load: PageServerLoad = async () => {
	const [data, counts, courseList, courseNames] = await Promise.all([
		crud.load(),
		redemptionCounts(),
		paidCourseOptions(),
		db.select({ id: course.id, name: course.name }).from(course)
	]);
	const names = new Map(courseNames.map((row) => [row.id, row.name]));
	const now = new Date();
	return {
		...data,
		courseList,
		rows: data.rows.map((row) => {
			const redeemed = counts.get(row.id) ?? 0;
			return {
				...row,
				// Decimal columns arrive as strings, the edit dialog's number input wants a number; its
				// date pickers want the local day.
				discountValue: Number(row.discountValue),
				startsAt: row.startsAt ? localDate(row.startsAt) : '',
				endsAt: row.endsAt ? localDate(row.endsAt) : '',
				course: row.courseId === null ? null : (names.get(row.courseId) ?? null),
				redeemed,
				state: stateOf(row, redeemed, now)
			};
		})
	};
};

export const actions = {
	add: crud.actions.add,
	edit: crud.actions.edit,
	// Soft delete: enrollments and payments that used the code keep pointing at it.
	delete: lookupDeleteAction(promoCode, 'Promo code')
};

