import { describe, expect, it, vi } from 'vitest';
import { formatClock, resumeStart, WatchProgress } from './watch-progress.svelte';

describe('WatchProgress', () => {
	it('sends a skip ahead back to the furthest point watched', () => {
		const progress = new WatchProgress(false, () => {});
		expect(progress.observe(0, 100)).toBeNull();
		expect(progress.observe(1)).toBeNull();
		expect(progress.observe(2.5)).toBeNull();
		expect(progress.observe(60)).toBe(2.5);
		expect(progress.maxWatched).toBe(2.5);
	});

	it('counts 95% as watched, once', () => {
		const onWatched = vi.fn();
		const progress = new WatchProgress(false, onWatched);
		for (let second = 0; second <= 95; second += 1) progress.observe(second, 100);
		progress.observe(96, 100);
		expect(progress.watched).toBe(true);
		expect(onWatched).toHaveBeenCalledTimes(1);
	});

	it('lets a completed lesson seek anywhere', () => {
		const progress = new WatchProgress(true, () => {});
		expect(progress.watched).toBe(true);
		expect(progress.observe(80, 100)).toBeNull();
		expect(progress.seekLimit).toBe(Infinity);
	});
});

describe('resuming', () => {
	it('counts what played before the saved position as watched', () => {
		const progress = new WatchProgress(false, () => {}, 272);
		expect(progress.seekLimit).toBe(272);
		// Starting at the saved point, or scrubbing anywhere before it, is not a skip.
		expect(progress.observe(272, 600)).toBeNull();
		expect(progress.observe(30)).toBeNull();
		expect(progress.maxWatched).toBe(272);
		// Beyond it still is.
		expect(progress.observe(400)).toBe(272);
	});

	it('marks a lesson watched when the saved position was already near the end', () => {
		const onWatched = vi.fn();
		const progress = new WatchProgress(false, onWatched, 98);
		progress.observe(0, 100);
		expect(onWatched).toHaveBeenCalledTimes(1);
	});

	it('starts at the saved position, or over when it is at the end', () => {
		expect(resumeStart(272, 600)).toBe(272);
		expect(resumeStart(272, 0)).toBe(272);
		expect(resumeStart(597, 600)).toBe(0);
		expect(resumeStart(700, 600)).toBe(0);
		expect(resumeStart(0, 600)).toBe(0);
		expect(resumeStart(Number.NaN, 600)).toBe(0);
	});
});

describe('formatClock', () => {
	it('formats minutes and hours', () => {
		expect(formatClock(5)).toBe('0:05');
		expect(formatClock(605)).toBe('10:05');
		expect(formatClock(3725)).toBe('1:02:05');
	});
});
