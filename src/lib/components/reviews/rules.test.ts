import { describe, expect, it } from 'vitest';
import { averageRating, reviewCountText, reviewerName, summarizeRatings } from './rules';

describe('averageRating', () => {
	it('rounds to one decimal, halves up', () => {
		expect(averageRating(17, 4)).toBe(4.3); // 4.25
		expect(averageRating(9, 2)).toBe(4.5);
		expect(averageRating(14, 3)).toBe(4.7); // 4.666…
		expect(averageRating(13, 3)).toBe(4.3); // 4.333…
		expect(averageRating(5, 1)).toBe(5);
	});

	it('is 0 with no reviews', () => {
		expect(averageRating(0, 0)).toBe(0);
	});
});

describe('summarizeRatings', () => {
	it('counts, averages and spreads 5 down to 1, filling missing stars with 0', () => {
		const summary = summarizeRatings([
			{ rating: 5, count: 6 },
			{ rating: 4, count: 3 },
			{ rating: 1, count: 1 }
		]);
		expect(summary.count).toBe(10);
		expect(summary.average).toBe(4.3); // 43 / 10
		expect(summary.distribution).toEqual([
			{ stars: 5, count: 6, percent: 60 },
			{ stars: 4, count: 3, percent: 30 },
			{ stars: 3, count: 0, percent: 0 },
			{ stars: 2, count: 0, percent: 0 },
			{ stars: 1, count: 1, percent: 10 }
		]);
	});

	it('is empty but complete with no reviews', () => {
		const summary = summarizeRatings([]);
		expect(summary).toEqual({
			average: 0,
			count: 0,
			distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percent: 0 }))
		});
	});

	it('merges repeated tallies and ignores impossible ratings', () => {
		const summary = summarizeRatings([
			{ rating: 3, count: 1 },
			{ rating: 3, count: 2 },
			{ rating: 0, count: 9 },
			{ rating: 6, count: 9 },
			{ rating: 2.5, count: 9 }
		]);
		expect(summary.count).toBe(3);
		expect(summary.average).toBe(3);
		expect(summary.distribution.find((row) => row.stars === 3)).toEqual({ stars: 3, count: 3, percent: 100 });
	});

	it('rounds each bar on its own', () => {
		const summary = summarizeRatings([
			{ rating: 5, count: 1 },
			{ rating: 4, count: 1 },
			{ rating: 3, count: 1 }
		]);
		expect(summary.distribution.slice(0, 3).map((row) => row.percent)).toEqual([33, 33, 33]);
		expect(summary.average).toBe(4);
	});
});

describe('reviewerName', () => {
	it('shows a first name and last initial', () => {
		expect(reviewerName('Abebe Kebede')).toBe('Abebe K.');
		expect(reviewerName('  selam   bekele  tadesse ')).toBe('selam T.');
		expect(reviewerName('Madonna')).toBe('Madonna');
		expect(reviewerName('ሰላም በቀለ')).toBe('ሰላም በ.');
	});

	it('falls back when there is no name', () => {
		expect(reviewerName('')).toBe('Student');
		expect(reviewerName(null)).toBe('Student');
	});
});

it('reviewCountText pluralises', () => {
	expect(reviewCountText(1)).toBe('1 review');
	expect(reviewCountText(12)).toBe('12 reviews');
});
