import { and, count, desc, eq, gte, inArray, isNotNull, lt, notInArray, sql, type SQL } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import { db } from '$lib/server/db';
import { certificate, course, enrollment, promoCode, staffRole, user } from '$lib/server/db/schema';
import {
	bucketFormat,
	bucketKeys,
	bucketLabel,
	fillBuckets,
	percent,
	round2,
	type ReportRange
} from './report-range';

export * from './report-range';

/*
 * The admin reports. Definitions, so every number on the page means one thing:
 *
 * - An enrollment *counts* once it is ACTIVE, on the day it became so: `paid_at` (receipt approved,
 *   Chapa verified, or a staff enrolment), else `created_at` (a free course starts ACTIVE).
 * - *Paid* means MANUAL or CHAPA; FREE covers free courses, 100% promo codes and staff enrolments.
 * - *Revenue* is `amount` (what was left to pay after any promo) of paid ACTIVE enrollments whose
 *   `paid_at` falls in the range. All courses are priced in ETB.
 * - Every date is compared and bucketed in UTC — the database session's time zone.
 */

const PAID = ['MANUAL', 'CHAPA'] as const;

/** When an enrollment became active; see above. */
const enrolledAt = sql`coalesce(${enrollment.paidAt}, ${enrollment.createdAt})`;

const within = (column: MySqlColumn, range: ReportRange) =>
	and(gte(column, range.from), lt(column, range.to));
const enrolledWithin = (range: ReportRange): SQL =>
	sql`${enrolledAt} >= ${range.from} and ${enrolledAt} < ${range.to}`;

const active = eq(enrollment.status, 'ACTIVE');
const paid = inArray(enrollment.paymentProvider, PAID);
const revenueIn = (range: ReportRange) => and(active, paid, within(enrollment.paidAt, range));

const num = (value: unknown) => Number(value ?? 0);

/*
 * The bucket pattern inlined, not bound: a bound parameter makes the SELECT and GROUP BY
 * expressions differ textually, which ONLY_FULL_GROUP_BY rejects. It is one of two constants.
 */
const fmt = (range: ReportRange) => sql.raw(`'${bucketFormat(range.bucket)}'`);

export interface ReportKpis {
	revenue: number;
	paidEnrollments: number;
	freeEnrollments: number;
	newStudents: number;
	completions: number;
	/** Enrollments that became active in the range… */
	cohort: number;
	/** …and how many of those are completed by now. */
	cohortCompleted: number;
	completionRate: number;
	certificates: number;
	certificatesRevoked: number;
	promoDiscount: number;
	promoRedemptions: number;
	/** Right now, not in the range: receipts waiting for a decision. */
	pendingPayments: number;
}

async function kpis(range: ReportRange): Promise<ReportKpis> {
	const [[money], [free], [students], [completions], [cohort], [certs], [promo], [pending]] =
		await Promise.all([
			db
				.select({ revenue: sql<string>`coalesce(sum(${enrollment.amount}), 0)`, paid: count() })
				.from(enrollment)
				.where(revenueIn(range)),
			db
				.select({ value: count() })
				.from(enrollment)
				.where(and(active, eq(enrollment.paymentProvider, 'FREE'), enrolledWithin(range))),
			db
				.select({ value: count() })
				.from(user)
				.where(
					and(
						within(user.createdAt, range),
						notInArray(user.id, db.select({ id: staffRole.userId }).from(staffRole))
					)
				),
			db
				.select({ value: count() })
				.from(enrollment)
				.where(and(active, within(enrollment.completedAt, range))),
			db
				.select({
					total: count(),
					completed: sql<string>`coalesce(sum(${enrollment.completedAt} is not null), 0)`
				})
				.from(enrollment)
				.where(and(active, enrolledWithin(range))),
			db
				.select({
					issued: count(),
					revoked: sql<string>`coalesce(sum(${certificate.revokedAt} is not null), 0)`
				})
				.from(certificate)
				.where(within(certificate.issuedAt, range)),
			db
				.select({
					discount: sql<string>`coalesce(sum(${enrollment.discountAmount}), 0)`,
					redemptions: count()
				})
				.from(enrollment)
				.where(and(active, sql`${enrollment.discountAmount} > 0`, enrolledWithin(range))),
			db.select({ value: count() }).from(enrollment).where(eq(enrollment.status, 'PENDING'))
		]);

	const cohortTotal = num(cohort?.total);
	const cohortCompleted = num(cohort?.completed);
	return {
		revenue: round2(num(money?.revenue)),
		paidEnrollments: num(money?.paid),
		freeEnrollments: num(free?.value),
		newStudents: num(students?.value),
		completions: num(completions?.value),
		cohort: cohortTotal,
		cohortCompleted,
		completionRate: percent(cohortCompleted, cohortTotal),
		certificates: num(certs?.issued),
		certificatesRevoked: num(certs?.revoked),
		promoDiscount: round2(num(promo?.discount)),
		promoRedemptions: num(promo?.redemptions),
		pendingPayments: num(pending?.value)
	};
}

export interface TimeSeries {
	labels: string[];
	keys: string[];
	series: { label: string; data: number[] }[];
}

async function revenueOverTime(range: ReportRange, keys: string[]): Promise<TimeSeries> {
	const bucket = sql<string>`date_format(${enrollment.paidAt}, ${fmt(range)})`;
	const rows = await db
		.select({
			key: bucket,
			provider: enrollment.paymentProvider,
			value: sql<string>`sum(${enrollment.amount})`
		})
		.from(enrollment)
		.where(revenueIn(range))
		.groupBy(bucket, enrollment.paymentProvider);
	const of = (provider: string) =>
		rows.filter((row) => row.provider === provider).map((row) => ({ key: row.key, value: num(row.value) }));
	return {
		keys,
		labels: keys.map((key) => bucketLabel(key, range.bucket)),
		series: [
			{ label: 'Manual (receipt)', data: fillBuckets(keys, of('MANUAL')) },
			{ label: 'Chapa', data: fillBuckets(keys, of('CHAPA')) }
		]
	};
}

async function enrollmentsOverTime(range: ReportRange, keys: string[]): Promise<TimeSeries> {
	const bucket = sql<string>`date_format(${enrolledAt}, ${fmt(range)})`;
	const isFree = sql<number>`(${enrollment.paymentProvider} = 'FREE')`;
	const rows = await db
		.select({ key: bucket, free: isFree, value: count() })
		.from(enrollment)
		.where(and(active, enrolledWithin(range)))
		.groupBy(bucket, isFree);
	const of = (free: boolean) =>
		rows.filter((row) => Boolean(num(row.free)) === free).map((row) => ({ key: row.key, value: row.value }));
	return {
		keys,
		labels: keys.map((key) => bucketLabel(key, range.bucket)),
		series: [
			{ label: 'Paid', data: fillBuckets(keys, of(false)) },
			{ label: 'Free', data: fillBuckets(keys, of(true)) }
		]
	};
}

export interface CourseRow {
	courseId: number;
	course: string;
	slug: string;
	enrollments: number;
	paid: number;
	free: number;
	revenue: number;
	completed: number;
	completionRate: number;
}

/** Every course with an enrollment that became active in the range. */
async function courses(range: ReportRange): Promise<CourseRow[]> {
	const rows = await db
		.select({
			courseId: course.id,
			course: course.name,
			slug: course.slug,
			enrollments: count(),
			paid: sql<string>`sum(${enrollment.paymentProvider} <> 'FREE')`,
			revenue: sql<string>`coalesce(sum(case when ${enrollment.paymentProvider} <> 'FREE' and ${enrollment.paidAt} >= ${range.from} and ${enrollment.paidAt} < ${range.to} then ${enrollment.amount} else 0 end), 0)`,
			completed: sql<string>`sum(${enrollment.completedAt} is not null)`
		})
		.from(enrollment)
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.where(and(active, enrolledWithin(range)))
		.groupBy(course.id, course.name, course.slug);
	return rows
		.map((row) => {
			const enrollments = num(row.enrollments);
			const paidCount = num(row.paid);
			const completed = num(row.completed);
			return {
				courseId: row.courseId,
				course: row.course,
				slug: row.slug,
				enrollments,
				paid: paidCount,
				free: enrollments - paidCount,
				revenue: round2(num(row.revenue)),
				completed,
				completionRate: percent(completed, enrollments)
			};
		})
		.sort((a, b) => b.revenue - a.revenue || b.enrollments - a.enrollments || a.course.localeCompare(b.course));
}

async function revenueByProvider(range: ReportRange) {
	const rows = await db
		.select({
			provider: enrollment.paymentProvider,
			revenue: sql<string>`sum(${enrollment.amount})`,
			payments: count()
		})
		.from(enrollment)
		.where(revenueIn(range))
		.groupBy(enrollment.paymentProvider);
	return PAID.map((provider) => {
		const row = rows.find((entry) => entry.provider === provider);
		return { provider, revenue: round2(num(row?.revenue)), payments: num(row?.payments) };
	});
}

export interface PromoRow {
	code: string;
	redemptions: number;
	discount: number;
	revenue: number;
}

/** Redemptions are ACTIVE enrollments carrying a discount; a deleted code keeps its rows. */
async function promoUsage(range: ReportRange): Promise<PromoRow[]> {
	const code = sql<string>`coalesce(${promoCode.code}, '(deleted code)')`;
	const rows = await db
		.select({
			code,
			redemptions: count(),
			discount: sql<string>`sum(${enrollment.discountAmount})`,
			revenue: sql<string>`sum(${enrollment.amount})`
		})
		.from(enrollment)
		.leftJoin(promoCode, eq(promoCode.id, enrollment.promoCodeId))
		.where(and(active, sql`${enrollment.discountAmount} > 0`, enrolledWithin(range)))
		.groupBy(code);
	return rows
		.map((row) => ({
			code: row.code,
			redemptions: num(row.redemptions),
			discount: round2(num(row.discount)),
			revenue: round2(num(row.revenue))
		}))
		.sort((a, b) => b.redemptions - a.redemptions || b.discount - a.discount);
}

export interface PaymentRow {
	id: number;
	paidAt: Date;
	student: string;
	email: string;
	course: string;
	provider: 'MANUAL' | 'CHAPA' | 'FREE';
	amount: number;
	discount: number;
	promoCode: string | null;
	reference: string | null;
}

/** The newest money in the range, newest first. */
async function recentPayments(range: ReportRange, limit = 200): Promise<PaymentRow[]> {
	const rows = await db
		.select({
			id: enrollment.id,
			paidAt: enrollment.paidAt,
			student: user.name,
			email: user.email,
			course: course.name,
			provider: enrollment.paymentProvider,
			amount: enrollment.amount,
			discount: enrollment.discountAmount,
			promoCode: promoCode.code,
			reference: enrollment.transactionReference
		})
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.leftJoin(promoCode, eq(promoCode.id, enrollment.promoCodeId))
		.where(and(revenueIn(range), isNotNull(enrollment.paidAt)))
		.orderBy(desc(enrollment.paidAt), desc(enrollment.id))
		.limit(limit);
	return rows.map((row) => ({
		...row,
		paidAt: row.paidAt as Date,
		amount: round2(num(row.amount)),
		discount: round2(num(row.discount))
	}));
}

export async function getReport(range: ReportRange) {
	const keys = bucketKeys(range);
	const [summary, revenueSeries, enrollmentSeries, courseRows, providers, promos, payments] =
		await Promise.all([
			kpis(range),
			revenueOverTime(range, keys),
			enrollmentsOverTime(range, keys),
			courses(range),
			revenueByProvider(range),
			promoUsage(range),
			recentPayments(range)
		]);
	return {
		kpis: summary,
		revenueSeries,
		enrollmentSeries,
		courses: courseRows,
		providers,
		promos,
		payments
	};
}

export type Report = Awaited<ReturnType<typeof getReport>>;
