/*
 * Review rules shared by the form (limits it shows) and the server (limits it enforces), plus the
 * aggregation every rating display reads. No database or Node imports: the browser loads this.
 */

import { m } from '$lib/paraglide/messages';

export const REVIEW_COMMENT_MAX = 2000;
export const RATING_VALUES = [5, 4, 3, 2, 1] as const;

/** Progress at which an enrolled student is asked to rate a course they have not finished. */
export const RATE_PROMPT_PERCENT = 30;

// Getters, so each read is in the current language (never translated at import time).
export const RATING_WORDS: Record<number, string> = {
	get 1() {
		return m.catalog_rating_poor();
	},
	get 2() {
		return m.catalog_rating_fair();
	},
	get 3() {
		return m.catalog_rating_good();
	},
	get 4() {
		return m.catalog_rating_very_good();
	},
	get 5() {
		return m.catalog_rating_excellent();
	}
};

export interface RatingSummary {
	/** One decimal, e.g. 4.3; 0 when there are no reviews. */
	average: number;
	count: number;
	/** Reviews per star value, 5 down to 1. */
	distribution: { stars: number; count: number; percent: number }[];
}

/** The mean of `count` ratings summing to `sum`, to one decimal (halves round up). */
export function averageRating(sum: number, count: number): number {
	if (count <= 0) return 0;
	// Integer arithmetic until the last step, so 4.25 rounds to 4.3 and not 4.2.
	return Math.round((sum * 10) / count) / 10;
}

/** Average, count and the 5→1 distribution from per-star tallies (missing stars count 0). */
export function summarizeRatings(tallies: { rating: number; count: number }[]): RatingSummary {
	const byStar = new Map<number, number>();
	for (const { rating, count } of tallies) {
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
		byStar.set(rating, (byStar.get(rating) ?? 0) + Number(count));
	}
	let count = 0;
	let sum = 0;
	for (const [stars, n] of byStar) {
		count += n;
		sum += stars * n;
	}
	return {
		average: averageRating(sum, count),
		count,
		distribution: RATING_VALUES.map((stars) => {
			const n = byStar.get(stars) ?? 0;
			return { stars, count: n, percent: count ? Math.round((n / count) * 100) : 0 };
		})
	};
}

/** "Abebe Kebede" → "Abebe K.": enough to be a person, not enough to find them. */
export function reviewerName(fullName: string | null | undefined): string {
	const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return m.catalog_review_student_fallback();
	if (parts.length === 1) return parts[0];
	const last = Array.from(parts[parts.length - 1])[0]?.toUpperCase() ?? '';
	return `${parts[0]} ${last}.`;
}

/** "12 reviews", "1 review". */
export const reviewCountText = (count: number) => m.catalog_review_count({ count });
