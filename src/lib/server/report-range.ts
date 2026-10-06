/*
 * The reports' date range and its buckets. Pure functions on UTC dates — the database session runs
 * in UTC, so a "day" here is the same day SQL's DATE_FORMAT groups by.
 */

export const RANGE_PRESETS = ['7d', '30d', '90d', 'year', 'custom'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export type Bucket = 'day' | 'month';

export interface ReportRange {
	preset: RangePreset;
	/** First instant inside the range: midnight UTC of the first day. */
	from: Date;
	/** First instant after the range: midnight UTC of the day after the last. */
	to: Date;
	/** The first and last day, inclusive, as YYYY-MM-DD (what the filter's inputs show). */
	fromDay: string;
	toDay: string;
	days: number;
	bucket: Bucket;
}

const DAY_MS = 86_400_000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Longer ranges than this are drawn by month; up to it, by day. */
export const DAILY_LIMIT_DAYS = 92;
/** A custom range is cut to this many days, so a typo cannot ask for a century of buckets. */
export const MAX_RANGE_DAYS = 366 * 5;

/** Midnight UTC of the day `date` falls on. */
export function startOfUtcDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** A YYYY-MM-DD string as midnight UTC, or null when it is not a real calendar day. */
export function parseDay(value: string | null | undefined): Date | null {
	const match = value?.match(ISO_DAY);
	if (!match) return null;
	const [, y, m, d] = match.map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	// Date.UTC rolls 2026-02-31 over to March; a rolled date is not the day that was typed.
	return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
		? date
		: null;
}

function build(preset: RangePreset, first: Date, last: Date): ReportRange {
	const to = addDays(last, 1);
	const days = Math.round((to.getTime() - first.getTime()) / DAY_MS);
	return {
		preset,
		from: first,
		to,
		fromDay: isoDay(first),
		toDay: isoDay(last),
		days,
		bucket: days <= DAILY_LIMIT_DAYS ? 'day' : 'month'
	};
}

/**
 * The range a report URL asks for: `?range=7d|30d|90d|year`, or `?range=custom&from=…&to=…`.
 * Anything unreadable falls back to the last 30 days; a reversed custom range is swapped.
 */
export function resolveRange(params: URLSearchParams, now = new Date()): ReportRange {
	const today = startOfUtcDay(now);
	const preset = params.get('range');
	switch (preset) {
		case '7d':
			return build('7d', addDays(today, -6), today);
		case '90d':
			return build('90d', addDays(today, -89), today);
		case 'year':
			return build('year', new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), today);
		case 'custom': {
			let first = parseDay(params.get('from'));
			let last = parseDay(params.get('to'));
			if (!first || !last) break;
			if (first > last) [first, last] = [last, first];
			if ((last.getTime() - first.getTime()) / DAY_MS >= MAX_RANGE_DAYS) {
				first = addDays(last, -(MAX_RANGE_DAYS - 1));
			}
			return build('custom', first, last);
		}
	}
	return build('30d', addDays(today, -29), today);
}

/** The bucket a moment falls in: '2026-10-06' by day, '2026-10' by month (UTC). */
export function bucketKey(date: Date, bucket: Bucket): string {
	return bucket === 'day' ? isoDay(date) : date.toISOString().slice(0, 7);
}

/** The MariaDB DATE_FORMAT pattern producing the same keys as `bucketKey`. */
export const bucketFormat = (bucket: Bucket) => (bucket === 'day' ? '%Y-%m-%d' : '%Y-%m');

/** Every bucket in the range, in order, including the empty ones a chart must still show. */
export function bucketKeys(range: Pick<ReportRange, 'from' | 'to' | 'bucket'>): string[] {
	const keys: string[] = [];
	if (range.bucket === 'day') {
		for (let day = range.from; day < range.to; day = addDays(day, 1)) keys.push(isoDay(day));
		return keys;
	}
	let year = range.from.getUTCFullYear();
	let month = range.from.getUTCMonth();
	const last = addDays(range.to, -1);
	const end = last.getUTCFullYear() * 12 + last.getUTCMonth();
	while (year * 12 + month <= end) {
		keys.push(`${year}-${String(month + 1).padStart(2, '0')}`);
		month += 1;
		if (month === 12) [year, month] = [year + 1, 0];
	}
	return keys;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-10-06' → '6 Oct'; '2026-10' → 'Oct 2026'. */
export function bucketLabel(key: string, bucket: Bucket): string {
	const [y, m, d] = key.split('-').map(Number);
	return bucket === 'day' ? `${d} ${MONTHS[m - 1]}` : `${MONTHS[m - 1]} ${y}`;
}

/** Rows keyed by bucket, laid onto every bucket of the range (missing ones are 0). */
export function fillBuckets(keys: string[], rows: { key: string; value: number }[]): number[] {
	const totals = new Map<string, number>();
	for (const row of rows) totals.set(row.key, (totals.get(row.key) ?? 0) + Number(row.value));
	return keys.map((key) => round2(totals.get(key) ?? 0));
}

/** Money and rates to two decimals, without float dust (0.1 + 0.2). */
export const round2 = (value: number) => Math.round(value * 100) / 100;

/** A share as a percentage to one decimal; 0 when there is nothing to divide by. */
export const percent = (part: number, whole: number) =>
	whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
