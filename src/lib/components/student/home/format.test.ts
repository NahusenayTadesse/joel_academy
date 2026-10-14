import { describe, expect, it } from 'vitest';
import { formatLearningTime, formatRelativeTime } from './format';

describe('formatRelativeTime', () => {
	const now = Date.parse('2026-10-06T12:00:00Z');
	const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

	it('reads naturally across units', () => {
		expect(formatRelativeTime(ago(10), now)).toBe('just now');
		expect(formatRelativeTime(ago(5 * 60), now)).toBe('5 minutes ago');
		expect(formatRelativeTime(ago(3 * 3600), now)).toBe('3 hours ago');
		expect(formatRelativeTime(ago(26 * 3600), now)).toBe('yesterday');
		expect(formatRelativeTime(ago(14 * 86400), now)).toBe('2 weeks ago');
	});

	it('falls back to the date past a month', () => {
		expect(formatRelativeTime('2026-08-01T09:00:00Z', now)).toBe('Aug 1, 2026');
	});
});

describe('formatLearningTime', () => {
	it('rounds to minutes and splits hours', () => {
		expect(formatLearningTime(0)).toBe('0m');
		expect(formatLearningTime(45 * 60)).toBe('45m');
		expect(formatLearningTime(2 * 3600)).toBe('2h');
		expect(formatLearningTime(3 * 3600 + 20 * 60 + 10)).toBe('3h 20m');
	});
});
