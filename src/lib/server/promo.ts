import { and, eq, gt, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chapaPayment, course, enrollment, promoCode } from '$lib/server/db/schema';
import { effectivePrice } from '$lib/progress';
import { normalizePromoCode, PROMO_CODE_PATTERN, promoPricing, type PromoPricing } from '$lib/promo';

/*
 * Promo codes at checkout. The server alone prices a course: every write re-quotes the code here,
 * whatever the page showed. Redemptions are counted, not stored, from enrollments that carry the
 * code and Chapa checkouts still in flight — so an abandoned checkout holds its place for an hour
 * and then lets it go.
 */

/** How long an unpaid Chapa checkout keeps its redemption reserved. */
export const PENDING_HOLD_MS = 60 * 60 * 1000;

type Executor = Pick<typeof db, 'select'>;

export class PromoError extends Error {
	constructor(
		readonly code: 'INVALID' | 'NOT_FOUND' | 'NOT_STARTED' | 'EXPIRED' | 'WRONG_COURSE' | 'USED_UP' | 'NOT_PAID',
		message: string
	) {
		super(message);
		this.name = 'PromoError';
	}
}

export interface PromoQuote extends PromoPricing {
	currency: string;
	promo: { id: number; code: string; description: string | null } | null;
}

/**
 * Who holds each code: one redemption per student and course, whether it is an enrollment (active,
 * or a receipt under review) or a Chapa checkout started within the hold. A student's abandoned
 * attempts and the place they finally got therefore count once, not once each.
 */
async function holders(executor: Executor, promoIds?: number[]): Promise<Map<number, Set<string>>> {
	const holdFrom = new Date(Date.now() - PENDING_HOLD_MS);
	const only = <T extends typeof enrollment.promoCodeId | typeof chapaPayment.promoCodeId>(column: T) =>
		promoIds ? inArray(column, promoIds) : isNotNull(column);
	const [enrolled, inFlight] = await Promise.all([
		executor
			.select({ promoId: enrollment.promoCodeId, userId: enrollment.userId, courseId: enrollment.courseId })
			.from(enrollment)
			.where(and(only(enrollment.promoCodeId), inArray(enrollment.status, ['ACTIVE', 'PENDING']))),
		executor
			.select({ promoId: chapaPayment.promoCodeId, userId: chapaPayment.userId, courseId: chapaPayment.courseId })
			.from(chapaPayment)
			.where(and(only(chapaPayment.promoCodeId), eq(chapaPayment.status, 'PENDING'), gt(chapaPayment.createdAt, holdFrom)))
	]);
	const byCode = new Map<number, Set<string>>();
	for (const row of [...enrolled, ...inFlight]) {
		if (row.promoId === null) continue;
		const set = byCode.get(row.promoId) ?? new Set<string>();
		set.add(`${row.userId}:${row.courseId}`);
		byCode.set(row.promoId, set);
	}
	return byCode;
}

/** Redemptions per code, for the dashboard. */
export async function redemptionCounts(): Promise<Map<number, number>> {
	const byCode = await holders(db);
	return new Map([...byCode].map(([id, set]) => [id, set.size]));
}

/**
 * Prices a paid course for a student, with a code or without one. Throws `PromoError` with a
 * message fit to show when the code cannot be used. Pass `lock` inside a transaction that then
 * records the redemption: the code's row stays locked until it commits, so two students racing for
 * the last redemption cannot both get it.
 */
export async function quoteCourse(
	input: { userId: string; courseId: number; code?: string | null; lock?: boolean; now?: Date },
	executor: Executor = db
): Promise<PromoQuote> {
	const [target] = await executor
		.select({ id: course.id, accessType: course.accessType, price: course.price, discountPrice: course.discountPrice, currency: course.currency })
		.from(course)
		.where(and(eq(course.id, input.courseId), eq(course.status, true)))
		.limit(1);
	if (!target || target.accessType !== 'PAID') throw new PromoError('NOT_PAID', 'Promo codes apply to paid courses only.');

	const base = effectivePrice(target.price, target.discountPrice);
	const code = normalizePromoCode(input.code);
	if (!code) return { ...promoPricing(base, 'FIXED', 0), currency: target.currency, promo: null };
	if (!PROMO_CODE_PATTERN.test(code)) throw new PromoError('INVALID', 'That is not a valid promo code.');

	const query = executor
		.select()
		.from(promoCode)
		.where(and(eq(promoCode.code, code), isNull(promoCode.deletedAt), eq(promoCode.status, true)))
		.limit(1);
	const [found] = input.lock ? await query.for('update') : await query;
	if (!found) throw new PromoError('NOT_FOUND', 'That promo code does not exist or is no longer active.');

	const now = input.now ?? new Date();
	if (found.startsAt && found.startsAt > now) throw new PromoError('NOT_STARTED', 'That promo code is not active yet.');
	if (found.endsAt && found.endsAt < now) throw new PromoError('EXPIRED', 'That promo code has expired.');
	if (found.courseId !== null && found.courseId !== target.id)
		throw new PromoError('WRONG_COURSE', 'That promo code is for a different course.');

	if (found.maxRedemptions !== null) {
		// The student's own earlier attempt on this course is the redemption they are making now.
		const taken = (await holders(executor, [found.id])).get(found.id) ?? new Set<string>();
		taken.delete(`${input.userId}:${target.id}`);
		if (taken.size >= found.maxRedemptions)
			throw new PromoError('USED_UP', 'That promo code has reached its redemption limit.');
	}

	return {
		...promoPricing(base, found.discountType, found.discountValue),
		currency: target.currency,
		promo: { id: found.id, code: found.code, description: found.description }
	};
}
