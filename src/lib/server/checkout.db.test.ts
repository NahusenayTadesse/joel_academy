import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapaVerification } from './chapa';

/*
 * Promo quoting, full-discount enrollment and Chapa settlement against a real database, with
 * Chapa's verify API and the mailer replaced. Runs only when DATABASE_URL names a database ending
 * in `_test`, since it writes (and then removes) its own user, codes and payments.
 */

const url = process.env.DATABASE_URL ?? '';
const enabled = /\/[a-z0-9_]+_test(\?|$)/i.test(url);

const sent = vi.hoisted(() => ({ enrolled: [] as unknown[], certificates: [] as unknown[], staffReviews: [] as unknown[] }));
vi.mock('$lib/server/email', () => ({
	enrollmentConfirmedEmail: vi.fn(async (details: unknown) => {
		sent.enrolled.push(details);
		return 'SKIPPED';
	}),
	certificateIssuedEmail: vi.fn(async (details: unknown) => {
		sent.certificates.push(details);
		return 'SKIPPED';
	}),
	receiptSubmittedAdminEmail: vi.fn(async () => undefined),
	paymentNeedsReviewAdminEmail: vi.fn(async (details: unknown) => {
		sent.staffReviews.push(details);
	})
}));

describe.skipIf(!enabled)('checkout against the test database', () => {
	const userId = `test-${Date.now()}`;
	const prefix = `T${Date.now().toString(36).toUpperCase()}`;
	let mod: {
		db: typeof import('./db').db;
		schema: typeof import('./db/schema');
		promo: typeof import('./promo');
		enrollment: typeof import('./enrollment');
		settlement: typeof import('./chapa-settlement');
		orm: typeof import('drizzle-orm');
	};
	let paidCourse: { id: number; price: string; discountPrice: string | null; currency: string };
	let otherCourse: { id: number };

	beforeAll(async () => {
		mod = {
			db: (await import('./db')).db,
			schema: await import('./db/schema'),
			promo: await import('./promo'),
			enrollment: await import('./enrollment'),
			settlement: await import('./chapa-settlement'),
			orm: await import('drizzle-orm')
		};
		const { db, schema, orm } = mod;
		const [[{ name }]] = (await db.execute(orm.sql`select database() as name`)) as unknown as [[{ name: string }]];
		if (!name.endsWith('_test')) throw new Error(`Refusing to run against ${name}`);

		const courses = await db
			.select({ id: schema.course.id, price: schema.course.price, discountPrice: schema.course.discountPrice, currency: schema.course.currency })
			.from(schema.course)
			.where(orm.and(orm.eq(schema.course.accessType, 'PAID'), orm.eq(schema.course.status, true)))
			.orderBy(schema.course.id)
			.limit(2);
		[paidCourse, otherCourse] = courses;
		await db.insert(schema.user).values({ id: userId, name: 'Test Buyer', email: `${userId}@example.com` });
	});

	afterAll(async () => {
		if (!mod) return;
		const { db, schema, orm } = mod;
		await db.delete(schema.user).where(orm.eq(schema.user.id, userId));
		await db.delete(schema.promoCode).where(orm.like(schema.promoCode.code, `${prefix}%`));
	});

	beforeEach(async () => {
		const { db, schema, orm } = mod;
		sent.enrolled.length = 0;
		sent.certificates.length = 0;
		sent.staffReviews.length = 0;
		await db.delete(schema.certificate).where(orm.eq(schema.certificate.userId, userId));
		await db.delete(schema.lessonProgress).where(orm.eq(schema.lessonProgress.userId, userId));
		await db.delete(schema.enrollment).where(orm.eq(schema.enrollment.userId, userId));
		await db.delete(schema.chapaPayment).where(orm.eq(schema.chapaPayment.userId, userId));
	});

	async function code(suffix: string, values: Partial<typeof import('./db/schema').promoCode.$inferInsert>) {
		const { db, schema } = mod;
		const name = `${prefix}${suffix}`;
		await db.insert(schema.promoCode).values({ code: name, discountType: 'PERCENT', discountValue: '10.00', ...values });
		return name;
	}

	const price = () => (paidCourse.discountPrice ?? paidCourse.price);

	it('prices percent, fixed and course-specific codes from the effective price', async () => {
		const { promo } = mod;
		const percent = await code('P', { discountType: 'PERCENT', discountValue: '50.00' });
		const fixed = await code('F', { discountType: 'FIXED', discountValue: '5.00' });
		const mine = await code('C', { courseId: paidCourse.id });

		const none = await promo.quoteCourse({ userId, courseId: paidCourse.id });
		expect(none).toMatchObject({ price: Number(price()).toFixed(2), discountAmount: '0.00', promo: null });

		const half = await promo.quoteCourse({ userId, courseId: paidCourse.id, code: percent.toLowerCase() });
		expect(Number(half.amountDue) + Number(half.discountAmount)).toBeCloseTo(Number(price()));
		expect(half.promo?.code).toBe(percent);

		const five = await promo.quoteCourse({ userId, courseId: paidCourse.id, code: fixed });
		expect(five.discountAmount).toBe('5.00');

		await expect(promo.quoteCourse({ userId, courseId: paidCourse.id, code: mine })).resolves.toMatchObject({
			promo: { code: mine }
		});
		await expect(promo.quoteCourse({ userId, courseId: otherCourse.id, code: mine })).rejects.toMatchObject({
			code: 'WRONG_COURSE'
		});
	});

	it('refuses expired, future, inactive, deleted and unknown codes', async () => {
		const { promo } = mod;
		const day = 24 * 60 * 60 * 1000;
		const expired = await code('X', { endsAt: new Date(Date.now() - day) });
		const future = await code('S', { startsAt: new Date(Date.now() + day) });
		const off = await code('O', { status: false });
		const gone = await code('D', { deletedAt: new Date() });
		const quote = (c: string) => promo.quoteCourse({ userId, courseId: paidCourse.id, code: c });
		await expect(quote(expired)).rejects.toMatchObject({ code: 'EXPIRED' });
		await expect(quote(future)).rejects.toMatchObject({ code: 'NOT_STARTED' });
		await expect(quote(off)).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(quote(gone)).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(quote(`${prefix}NOPE`)).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(quote('bad code!')).rejects.toMatchObject({ code: 'INVALID' });
	});

	it('counts redemptions, holding in-flight Chapa checkouts for an hour, but not the student’s own', async () => {
		const { db, schema, promo } = mod;
		const limited = await code('M', { maxRedemptions: 1 });
		const [found] = await db.select().from(schema.promoCode).where(mod.orm.eq(schema.promoCode.code, limited));

		// Someone else's checkout in flight holds the only redemption…
		const otherId = `${userId}-b`;
		await db.insert(schema.user).values({ id: otherId, name: 'Other Buyer', email: `${otherId}@example.com` });
		try {
			await db.insert(schema.chapaPayment).values({
				txRef: `jta-hold-${Date.now()}`,
				userId: otherId,
				courseId: paidCourse.id,
				amount: '1.00',
				promoCodeId: found.id
			});
			await expect(promo.quoteCourse({ userId, courseId: paidCourse.id, code: limited })).rejects.toMatchObject({
				code: 'USED_UP'
			});
			// …while it is the holder's own, it does not count against them.
			await expect(
				promo.quoteCourse({ userId: otherId, courseId: paidCourse.id, code: limited })
			).resolves.toBeTruthy();
			expect((await promo.redemptionCounts()).get(found.id)).toBe(1);

			// An hour later the abandoned checkout lets it go.
			await db
				.update(schema.chapaPayment)
				.set({ createdAt: new Date(Date.now() - 61 * 60 * 1000) })
				.where(mod.orm.eq(schema.chapaPayment.userId, otherId));
			await expect(promo.quoteCourse({ userId, courseId: paidCourse.id, code: limited })).resolves.toBeTruthy();
		} finally {
			await db.delete(schema.user).where(mod.orm.eq(schema.user.id, otherId));
		}
	});

	it('enrolls for free with a 100% code, once, and refuses a partial one', async () => {
		const { enrollment } = mod;
		const full = await code('H', { discountValue: '100.00' });
		const partial = await code('Q', { discountValue: '20.00' });

		await expect(enrollment.enrollWithFullDiscount(userId, paidCourse.id, partial)).rejects.toMatchObject({
			code: 'PAYMENT_DUE'
		});
		const placed = await enrollment.enrollWithFullDiscount(userId, paidCourse.id, full);
		expect(placed).toMatchObject({ status: 'ACTIVE', paymentProvider: 'FREE', amount: '0.00', discountAmount: Number(price()).toFixed(2) });
		expect(sent.enrolled).toHaveLength(1);
		await expect(enrollment.enrollWithFullDiscount(userId, paidCourse.id, full)).rejects.toMatchObject({
			code: 'ALREADY_ENROLLED'
		});
	});

	it('records the promo on a manual receipt, and refuses one with nothing to pay', async () => {
		const { db, schema, enrollment } = mod;
		const [method] = await db.select({ id: schema.paymentMethod.id }).from(schema.paymentMethod).limit(1);
		const fixed = await code('R', { discountType: 'FIXED', discountValue: '2.50' });
		const full = await code('Z', { discountValue: '100.00' });
		const base = { userId, courseId: paidCourse.id, paymentMethodId: method.id, receipt: 'x.png', transactionReference: 'TX1' };

		await expect(enrollment.startPaidEnrollment({ ...base, promoCode: full })).rejects.toMatchObject({ code: 'NO_PAYMENT_DUE' });
		const placed = await enrollment.startPaidEnrollment({ ...base, promoCode: fixed });
		expect(placed).toMatchObject({
			status: 'PENDING',
			paymentProvider: 'MANUAL',
			discountAmount: '2.50',
			amount: (Number(price()) - 2.5).toFixed(2)
		});
		expect(placed.promoCodeId).not.toBeNull();
	});

	it('emails a free enrollment once, and a certificate only when it is first issued', async () => {
		const { db, schema, orm, enrollment } = mod;
		const [free] = await db
			.select({ id: schema.course.id })
			.from(schema.course)
			.where(orm.and(orm.eq(schema.course.accessType, 'FREE'), orm.eq(schema.course.status, true), orm.eq(schema.course.certificateEnabled, true)))
			.orderBy(schema.course.id)
			.limit(1);
		await enrollment.enrollFree(userId, free.id);
		await enrollment.enrollFree(userId, free.id);
		expect(sent.enrolled).toHaveLength(1);
		expect(await enrollment.getEnrollment(userId, free.id)).toMatchObject({ status: 'ACTIVE', paymentProvider: 'FREE' });

		const lessons = await db.select({ id: schema.lesson.id }).from(schema.lesson).where(orm.eq(schema.lesson.courseId, free.id));
		const results = [];
		for (const lesson of lessons) results.push(await enrollment.markLessonComplete(userId, lesson.id));
		const last = results.at(-1)!;
		expect(last.progress.completed).toBe(true);
		expect(last.certificateIssued).toBe(true);
		expect(results.slice(0, -1).every((r) => !r.certificateIssued)).toBe(true);
		expect(sent.certificates).toHaveLength(1);
		expect(sent.certificates[0]).toMatchObject({ to: `${userId}@example.com`, code: last.certificateCode });

		// Completing a lesson again keeps the certificate and sends nothing.
		const again = await enrollment.markLessonComplete(userId, lessons[0].id);
		expect(again).toMatchObject({ certificateCode: last.certificateCode, certificateIssued: false });
		expect(sent.certificates).toHaveLength(1);
	});

	describe('settleChapaPayment', () => {
		async function payment(amount = '16.99', currency = 'ETB') {
			const { db, schema } = mod;
			const txRef = `jta-test${Math.random().toString(36).slice(2, 12)}`;
			await db.insert(schema.chapaPayment).values({ txRef, userId, courseId: paidCourse.id, amount, currency });
			return txRef;
		}
		const chapaSays = (over: Partial<ChapaVerification> = {}) =>
			vi.fn(async (txRef: string): Promise<ChapaVerification> => ({
				found: true,
				status: 'success',
				amount: '16.99',
				currency: 'ETB',
				txRef,
				reference: 'APtest123',
				message: 'ok',
				...over
			}));
		const placeOf = async () => mod.enrollment.getEnrollment(userId, paidCourse.id);

		it('settles a verified payment: PAID, enrollment ACTIVE via Chapa, one email', async () => {
			const txRef = await payment();
			const verify = chapaSays();
			const outcome = await mod.settlement.settleChapaPayment(txRef, verify);
			expect(outcome).toMatchObject({ status: 'paid', alreadySettled: false, payment: { status: 'PAID', chapaReference: 'APtest123' } });
			expect(await placeOf()).toMatchObject({
				status: 'ACTIVE',
				paymentProvider: 'CHAPA',
				amount: '16.99',
				transactionReference: 'APtest123'
			});
			expect((await placeOf())?.paidAt).toBeInstanceOf(Date);
			expect(sent.enrolled).toHaveLength(1);

			// Again: nothing new is written, nobody is emailed twice, Chapa is not even asked.
			const again = await mod.settlement.settleChapaPayment(txRef, verify);
			expect(again).toMatchObject({ status: 'paid', alreadySettled: true });
			expect(verify).toHaveBeenCalledTimes(1);
			expect(sent.enrolled).toHaveLength(1);
		});

		it('settles exactly once when the webhook and the return page race', async () => {
			const txRef = await payment();
			const verify = chapaSays();
			const outcomes = await Promise.all([1, 2, 3].map(() => mod.settlement.settleChapaPayment(txRef, verify)));
			expect(outcomes.every((o) => o.status === 'paid')).toBe(true);
			expect(outcomes.filter((o) => o.status === 'paid' && !o.alreadySettled)).toHaveLength(1);
			expect(sent.enrolled).toHaveLength(1);
		});

		it('turns a pending or rejected receipt into an ACTIVE Chapa enrollment', async () => {
			const { db, schema } = mod;
			await db.insert(schema.enrollment).values({
				userId,
				courseId: paidCourse.id,
				status: 'REJECTED',
				paymentProvider: 'MANUAL',
				receipt: 'old.png',
				rejectionReason: 'Blurry'
			});
			const outcome = await mod.settlement.settleChapaPayment(await payment(), chapaSays());
			expect(outcome.status).toBe('paid');
			expect(await placeOf()).toMatchObject({ status: 'ACTIVE', paymentProvider: 'CHAPA', rejectionReason: null });
		});

		it('records a second payment for an active course and alerts staff to refund it', async () => {
			const first = await payment();
			await mod.settlement.settleChapaPayment(first, chapaSays());
			const second = await payment();
			const outcome = await mod.settlement.settleChapaPayment(second, chapaSays());
			expect(outcome).toMatchObject({ status: 'paid', payment: { status: 'PAID' } });
			expect(sent.enrolled).toHaveLength(1);
			expect(sent.staffReviews).toHaveLength(1);
			expect(sent.staffReviews[0]).toMatchObject({ reason: expect.stringMatching(/refund/i) });
		});

		it('refuses an amount or currency mismatch and marks the payment FAILED', async () => {
			const short = await payment();
			expect(await mod.settlement.settleChapaPayment(short, chapaSays({ amount: '1.00' }))).toMatchObject({
				status: 'failed',
				payment: { status: 'FAILED' }
			});
			// Money was taken: staff hear about it once, not again on every re-check.
			expect(sent.staffReviews).toHaveLength(1);
			expect(sent.staffReviews[0]).toMatchObject({ reason: expect.stringMatching(/needs staff review/i) });
			await mod.settlement.settleChapaPayment(short, chapaSays({ amount: '1.00' }));
			expect(sent.staffReviews).toHaveLength(1);
			const dollars = await payment();
			expect(await mod.settlement.settleChapaPayment(dollars, chapaSays({ currency: 'USD' }))).toMatchObject({
				status: 'failed'
			});
			expect(await placeOf()).toBeUndefined();
			expect(sent.enrolled).toHaveLength(0);
			expect(sent.staffReviews).toHaveLength(2);
		});

		it('leaves an unconfirmed payment PENDING and reports a retryable wait', async () => {
			const txRef = await payment();
			expect(await mod.settlement.settleChapaPayment(txRef, chapaSays({ status: 'pending' }))).toMatchObject({
				status: 'pending',
				retryable: true,
				payment: { status: 'PENDING' }
			});
			const unreachable = vi.fn(async (): Promise<ChapaVerification> => {
				throw new Error('ECONNRESET');
			});
			expect(await mod.settlement.settleChapaPayment(txRef, unreachable)).toMatchObject({ status: 'pending', retryable: true });
			expect(await placeOf()).toBeUndefined();
		});

		it('marks a cancelled payment FAILED, and still settles it if Chapa later says it was paid', async () => {
			const txRef = await payment();
			expect(await mod.settlement.settleChapaPayment(txRef, chapaSays({ status: 'cancelled' }))).toMatchObject({
				status: 'failed'
			});
			expect(await mod.settlement.settleChapaPayment(txRef, chapaSays())).toMatchObject({ status: 'paid' });
			expect(await placeOf()).toMatchObject({ status: 'ACTIVE' });
		});

		it('ignores a reference it never issued', async () => {
			expect(await mod.settlement.settleChapaPayment('jta-unknownref', chapaSays())).toMatchObject({
				status: 'pending',
				retryable: false,
				payment: null
			});
		});
	});
});
