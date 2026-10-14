import { describe, expect, it } from 'vitest';
import { courseProgress, effectivePrice } from './progress';
import { receiptProblem } from './receipt';
import { afterSignIn, safeRedirectPath } from './safe-redirect';

const origin = 'https://academy.example';

describe('safeRedirectPath', () => {
	it('keeps local paths with their query', () => {
		expect(safeRedirectPath('/courses/x?tab=1', origin)).toBe('/courses/x?tab=1');
	});
	it('refuses anything that could leave the site', () => {
		for (const target of ['https://evil.example/', '//evil.example', '/\\evil.example', 'evil', '', null, undefined])
			expect(safeRedirectPath(target, origin)).toBeNull();
	});
});

describe('afterSignIn', () => {
	it('sends staff to the dashboard and students to their courses by default', () => {
		expect(afterSignIn(new URL('/login', origin), true)).toBe('/dashboard');
		expect(afterSignIn(new URL('/login', origin), false)).toBe('/my');
	});
	it('honours a safe redirectTo and ignores an unsafe one', () => {
		expect(afterSignIn(new URL('/login?redirectTo=%2Fcheckout%2Fa', origin), false)).toBe('/checkout/a');
		expect(afterSignIn(new URL('/login?redirectTo=%2F%2Fevil.example', origin), false)).toBe('/my');
	});
});

describe('courseProgress', () => {
	const lessons = [
		{ id: 1, isMandatory: true },
		{ id: 2, isMandatory: true },
		{ id: 3, isMandatory: false }
	];
	it('counts only mandatory lessons toward completion', () => {
		expect(courseProgress(lessons, new Set([1, 3]))).toEqual({ percent: 50, required: 2, requiredDone: 1, completed: false });
		expect(courseProgress(lessons, new Set([1, 2]))).toMatchObject({ percent: 100, completed: true });
	});
	it('falls back to every lesson when none is mandatory', () => {
		const optional = lessons.map((lesson) => ({ ...lesson, isMandatory: false }));
		expect(courseProgress(optional, new Set([1, 2])).completed).toBe(false);
		expect(courseProgress(optional, new Set([1, 2, 3])).completed).toBe(true);
	});
	it('never completes a course without lessons', () => {
		expect(courseProgress([], new Set())).toEqual({ percent: 0, required: 0, requiredDone: 0, completed: false });
	});
});

describe('effectivePrice', () => {
	it('uses a discount only when it is lower', () => {
		expect(effectivePrice('49.99', '29.99')).toBe('29.99');
		expect(effectivePrice('49.99', '59.99')).toBe('49.99');
		expect(effectivePrice('49.99', null)).toBe('49.99');
	});
});

describe('receiptProblem', () => {
	const max = 10 * 1024 * 1024;
	it('accepts images and PDFs within the limit', () => {
		expect(receiptProblem({ size: 1000, type: 'image/png' }, max)).toBeNull();
		expect(receiptProblem({ size: 1000, type: 'application/pdf' }, max)).toBeNull();
	});
	it('refuses missing, oversized and other files', () => {
		expect(receiptProblem(null, max)).toMatch(/Upload/);
		expect(receiptProblem({ size: 0, type: 'image/png' }, max)).toMatch(/Upload/);
		expect(receiptProblem({ size: max + 1, type: 'image/png' }, max)).toMatch(/larger/);
		for (const type of ['video/mp4', 'text/plain', 'text/html', 'image/svg+xml', ''])
			expect(receiptProblem({ size: 10, type }, max)).toMatch(/image|PDF/);
	});
});
