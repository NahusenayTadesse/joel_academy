import { createHash } from 'node:crypto';
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { course, enrollment, pageView, staffRole, user } from '$lib/server/db/schema';
import { bucketFormat, bucketKeys, bucketLabel, fillBuckets, type ReportRange } from '$lib/server/report-range';
import { readUserAgent, referrerHost, utm } from '$lib/server/analytics-ua';

/*
 * The site's own visitor analytics. The browser reports each page it shows (see
 * $lib/components/analytics-beacon.svelte); nothing is stored in the browser and no address is
 * kept. A visitor is a salted hash of address + browser + UTC day, so the same person counts once
 * a day and cannot be followed from one day to the next.
 *
 * Staff, the dashboard, crawlers and audit tools are not counted.
 */

/** Rows older than this are deleted now and then, so the table stays small. */
const RETENTION_DAYS = 400;

export interface PageViewInput {
	path: string;
	route: string | null;
	locale: string;
	referrer: string | null;
	search: URLSearchParams;
	userAgent: string;
	ip: string;
	ownHost: string;
	country: string | null;
	userId: string | null;
}

function visitorId(ip: string, userAgent: string, day: string): string {
	const secret = env.BETTER_AUTH_SECRET ?? 'analytics';
	return createHash('sha256').update(`${secret}|${day}|${ip}|${userAgent}`).digest('hex').slice(0, 16);
}

/** Staff browsing their own site would skew every number; their ids are cached briefly. */
let staffIds: { at: number; ids: Set<string> } | undefined;
async function isStaff(userId: string): Promise<boolean> {
	if (!staffIds || Date.now() - staffIds.at > 5 * 60_000) {
		const rows = await db.select({ id: staffRole.userId }).from(staffRole);
		staffIds = { at: Date.now(), ids: new Set(rows.map((row) => row.id)) };
	}
	return staffIds.ids.has(userId);
}

export async function recordPageView(input: PageViewInput): Promise<void> {
	if (input.userId && (await isStaff(input.userId))) return;
	const client = readUserAgent(input.userAgent);
	const day = new Date().toISOString().slice(0, 10);
	await db.insert(pageView).values({
		visitor: visitorId(input.ip, input.userAgent, day),
		path: input.path.slice(0, 255),
		route: input.route?.slice(0, 120) ?? null,
		locale: input.locale === 'am' ? 'am' : 'en',
		referrer: referrerHost(input.referrer, input.ownHost),
		utmSource: utm(input.search.get('utm_source')),
		utmMedium: utm(input.search.get('utm_medium')),
		utmCampaign: utm(input.search.get('utm_campaign')),
		device: client.device,
		browser: client.browser,
		os: client.os,
		country: input.country && /^[A-Z]{2}$/.test(input.country) && input.country !== 'XX' ? input.country : null,
		signedIn: Boolean(input.userId)
	});
	// About once in a thousand views, drop what is past retention.
	if (Math.random() < 0.001) {
		const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
		await db.delete(pageView).where(lt(pageView.createdAt, cutoff));
	}
}

// ── Reading ─────────────────────────────────────────────────────────────────────────────────

const COURSE_ROUTE = '/(public)/courses/[slug]';
const CHECKOUT_ROUTE = '/(public)/(student)/checkout/[slug]';

const num = (value: unknown) => Number(value ?? 0) || 0;
const within = (range: ReportRange) => and(gte(pageView.createdAt, range.from), lt(pageView.createdAt, range.to));

export interface Ranked {
	label: string;
	visitors: number;
	views: number;
}

async function ranked(range: ReportRange, column: typeof pageView.path | typeof pageView.referrer | typeof pageView.utmSource | typeof pageView.country | typeof pageView.browser | typeof pageView.os | typeof pageView.device | typeof pageView.locale, limit = 20): Promise<Ranked[]> {
	const rows = await db
		.select({ label: column, visitors: countDistinct(pageView.visitor), views: count() })
		.from(pageView)
		.where(and(within(range), isNotNull(column)))
		.groupBy(column)
		.orderBy(desc(countDistinct(pageView.visitor)), desc(count()))
		.limit(limit);
	return rows.map((row) => ({ label: String(row.label), visitors: num(row.visitors), views: num(row.views) }));
}

export interface FunnelStep {
	key: string;
	label: string;
	value: number;
	hint: string;
}

/**
 * From interest to a paid place. The first two steps are distinct visitors (per day) who saw a
 * course page and a checkout page; the last two count receipts, since a payment is one person.
 */
async function funnel(range: ReportRange): Promise<FunnelStep[]> {
	const visitorsOn = async (route: string) => {
		const [row] = await db
			.select({ value: countDistinct(sql`concat(${pageView.visitor}, date(${pageView.createdAt}))`) })
			.from(pageView)
			.where(and(within(range), eq(pageView.route, route)));
		return num(row?.value);
	};
	const [courseViews, checkoutViews, [submitted], [approved]] = await Promise.all([
		visitorsOn(COURSE_ROUTE),
		visitorsOn(CHECKOUT_ROUTE),
		db
			.select({ value: count() })
			.from(enrollment)
			.where(
				and(
					eq(enrollment.paymentProvider, 'MANUAL'),
					gte(enrollment.createdAt, range.from),
					lt(enrollment.createdAt, range.to)
				)
			),
		db
			.select({ value: count() })
			.from(enrollment)
			.where(
				and(
					eq(enrollment.paymentProvider, 'MANUAL'),
					eq(enrollment.status, 'ACTIVE'),
					gte(enrollment.paidAt, range.from),
					lt(enrollment.paidAt, range.to)
				)
			)
	]);
	return [
		{ key: 'course', label: 'Viewed a course', value: courseViews, hint: 'Visitors on a course page' },
		{ key: 'checkout', label: 'Opened checkout', value: checkoutViews, hint: 'Visitors on a checkout page' },
		{ key: 'submitted', label: 'Sent a receipt', value: num(submitted?.value), hint: 'Bank-transfer receipts uploaded' },
		{ key: 'approved', label: 'Payment approved', value: num(approved?.value), hint: 'Receipts approved by staff' }
	];
}

export interface CourseInterest {
	slug: string;
	course: string;
	visitors: number;
	checkoutVisitors: number;
}

/** Which courses people look at, and how many of them go on to checkout. */
async function courseInterest(range: ReportRange): Promise<CourseInterest[]> {
	const slugOf = sql<string>`substring_index(${pageView.path}, '/', -1)`;
	const rows = await db
		.select({ route: pageView.route, slug: slugOf, visitors: countDistinct(pageView.visitor) })
		.from(pageView)
		.where(and(within(range), inArray(pageView.route, [COURSE_ROUTE, CHECKOUT_ROUTE])))
		.groupBy(pageView.route, slugOf);
	const bySlug = new Map<string, { visitors: number; checkoutVisitors: number }>();
	for (const row of rows) {
		const entry = bySlug.get(row.slug) ?? { visitors: 0, checkoutVisitors: 0 };
		if (row.route === COURSE_ROUTE) entry.visitors += num(row.visitors);
		else entry.checkoutVisitors += num(row.visitors);
		bySlug.set(row.slug, entry);
	}
	if (bySlug.size === 0) return [];
	const names = await db
		.select({ slug: course.slug, name: course.name })
		.from(course)
		.where(inArray(course.slug, [...bySlug.keys()]));
	const nameOf = new Map(names.map((row) => [row.slug, row.name]));
	return [...bySlug]
		.filter(([slug]) => nameOf.has(slug))
		.map(([slug, entry]) => ({ slug, course: nameOf.get(slug)!, ...entry }))
		.sort((a, b) => b.visitors - a.visitors || b.checkoutVisitors - a.checkoutVisitors);
}

export async function getAnalytics(range: ReportRange) {
	const keys = bucketKeys(range);
	const bucket = sql<string>`date_format(${pageView.createdAt}, ${sql.raw(`'${bucketFormat(range.bucket)}'`)})`;
	// A visitor id only lasts a day, so "visitors" over a range is the sum of daily visitors.
	const dailyVisitor = sql`concat(${pageView.visitor}, date(${pageView.createdAt}))`;

	const [[totals], series, pages, referrers, sources, countries, devices, browsers, systems, languages, steps, courses, [signups]] =
		await Promise.all([
			db
				.select({
					visitors: countDistinct(dailyVisitor),
					views: count(),
					signedIn: sql<number>`sum(${pageView.signedIn})`
				})
				.from(pageView)
				.where(within(range)),
			db
				.select({ key: bucket, visitors: countDistinct(dailyVisitor), views: count() })
				.from(pageView)
				.where(within(range))
				.groupBy(bucket),
			ranked(range, pageView.path, 50),
			ranked(range, pageView.referrer),
			ranked(range, pageView.utmSource),
			ranked(range, pageView.country),
			ranked(range, pageView.device),
			ranked(range, pageView.browser),
			ranked(range, pageView.os),
			ranked(range, pageView.locale),
			funnel(range),
			courseInterest(range),
			db
				.select({ value: count() })
				.from(user)
				.where(and(gte(user.createdAt, range.from), lt(user.createdAt, range.to)))
		]);

	const visitors = num(totals?.visitors);
	const views = num(totals?.views);
	const amharic = languages.find((row) => row.label === 'am')?.visitors ?? 0;
	const languageTotal = languages.reduce((sum, row) => sum + row.visitors, 0);

	return {
		kpis: {
			visitors,
			views,
			viewsPerVisitor: visitors ? Math.round((views / visitors) * 10) / 10 : 0,
			signups: num(signups?.value),
			signupRate: visitors ? Math.round((num(signups?.value) / visitors) * 1000) / 10 : 0,
			amharicShare: languageTotal ? Math.round((amharic / languageTotal) * 1000) / 10 : 0
		},
		traffic: {
			labels: keys.map((key) => bucketLabel(key, range.bucket)),
			visitors: fillBuckets(keys, series.map((row) => ({ key: row.key, value: num(row.visitors) }))),
			views: fillBuckets(keys, series.map((row) => ({ key: row.key, value: num(row.views) })))
		},
		pages,
		referrers,
		sources,
		countries,
		devices,
		browsers,
		systems,
		languages,
		funnel: steps,
		courses
	};
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
