import { describe, expect, it } from 'vitest';
import {
	bucketKey,
	bucketKeys,
	bucketLabel,
	fillBuckets,
	parseDay,
	percent,
	resolveRange
} from './report-range';

// 23:30 in Addis Ababa on 6 Oct is 20:30 UTC: still 6 Oct. 00:30 UTC on 7 Oct is a new day.
const NOW = new Date('2026-10-06T20:30:00Z');
const range = (query: string, now = NOW) => resolveRange(new URLSearchParams(query), now);

describe('resolveRange', () => {
	it('defaults to the last 30 days, today included', () => {
		const r = range('');
		expect(r.preset).toBe('30d');
		expect(r.fromDay).toBe('2026-09-07');
		expect(r.toDay).toBe('2026-10-06');
		expect(r.from.toISOString()).toBe('2026-09-07T00:00:00.000Z');
		expect(r.to.toISOString()).toBe('2026-10-07T00:00:00.000Z');
		expect(r.days).toBe(30);
		expect(r.bucket).toBe('day');
	});

	it('reads the presets', () => {
		expect(range('range=7d')).toMatchObject({ fromDay: '2026-09-30', toDay: '2026-10-06', days: 7 });
		expect(range('range=90d')).toMatchObject({ fromDay: '2026-07-09', days: 90, bucket: 'day' });
		expect(range('range=year')).toMatchObject({
			fromDay: '2026-01-01',
			toDay: '2026-10-06',
			days: 279,
			bucket: 'month'
		});
	});

	it('uses the UTC day, not the server clock', () => {
		expect(range('range=7d', new Date('2026-10-07T00:30:00Z')).toDay).toBe('2026-10-07');
		expect(range('range=7d', new Date('2026-10-06T23:59:59Z')).toDay).toBe('2026-10-06');
	});

	it('takes a custom range inclusively and swaps a reversed one', () => {
		const r = range('range=custom&from=2026-03-01&to=2026-03-31');
		expect(r).toMatchObject({ preset: 'custom', days: 31, bucket: 'day' });
		expect(r.to.toISOString()).toBe('2026-04-01T00:00:00.000Z');
		expect(range('range=custom&from=2026-03-31&to=2026-03-01').fromDay).toBe('2026-03-01');
		expect(range('range=custom&from=2026-05-05&to=2026-05-05').days).toBe(1);
	});

	it('falls back to 30 days for unreadable custom dates', () => {
		expect(range('range=custom&from=2026-02-31&to=2026-03-10').preset).toBe('30d');
		expect(range('range=custom&from=yesterday&to=2026-03-10').preset).toBe('30d');
		expect(range('range=custom').preset).toBe('30d');
		expect(range('range=forever').preset).toBe('30d');
	});

	it('caps a custom range at five years and buckets long ranges by month', () => {
		const r = range('range=custom&from=1990-01-01&to=2026-10-06');
		expect(r.days).toBe(366 * 5);
		expect(r.bucket).toBe('month');
		expect(range('range=custom&from=2026-01-01&to=2026-04-02').bucket).toBe('day'); // 92 days
		expect(range('range=custom&from=2026-01-01&to=2026-04-03').bucket).toBe('month'); // 93 days
	});
});

describe('parseDay', () => {
	it('accepts real days only', () => {
		expect(parseDay('2028-02-29')?.toISOString()).toBe('2028-02-29T00:00:00.000Z');
		expect(parseDay('2026-02-29')).toBeNull();
		expect(parseDay('2026-13-01')).toBeNull();
		expect(parseDay('')).toBeNull();
		expect(parseDay(null)).toBeNull();
	});
});

describe('buckets', () => {
	it('lists every day of a range', () => {
		expect(bucketKeys(range('range=7d'))).toEqual([
			'2026-09-30',
			'2026-10-01',
			'2026-10-02',
			'2026-10-03',
			'2026-10-04',
			'2026-10-05',
			'2026-10-06'
		]);
	});

	it('lists every month a range touches, across a year end', () => {
		const r = range('range=custom&from=2025-11-15&to=2026-02-03');
		r.bucket = 'month';
		expect(bucketKeys(r)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
		expect(bucketKeys(range('range=year'))).toHaveLength(10);
	});

	it('keys a moment by its UTC day or month', () => {
		const late = new Date('2026-10-31T23:59:59Z');
		expect(bucketKey(late, 'day')).toBe('2026-10-31');
		expect(bucketKey(late, 'month')).toBe('2026-10');
		expect(bucketKey(new Date('2026-11-01T00:00:00Z'), 'month')).toBe('2026-11');
	});

	it('labels buckets for chart axes', () => {
		expect(bucketLabel('2026-10-06', 'day')).toBe('6 Oct');
		expect(bucketLabel('2026-01', 'month')).toBe('Jan 2026');
	});

	it('fills missing buckets with zero and adds duplicates', () => {
		expect(
			fillBuckets(
				['2026-10-01', '2026-10-02', '2026-10-03'],
				[
					{ key: '2026-10-03', value: 0.1 },
					{ key: '2026-10-03', value: 0.2 },
					{ key: '2026-10-01', value: 5 },
					{ key: '2026-09-30', value: 99 }
				]
			)
		).toEqual([5, 0, 0.3]);
	});
});

describe('percent', () => {
	it('is safe on an empty whole', () => {
		expect(percent(1, 3)).toBe(33.3);
		expect(percent(0, 0)).toBe(0);
	});
});
