/*
 * Promo-code rules that need no database: the code's shape and the discount arithmetic. Shared by
 * the dashboard form (which validates in the browser) and the server, which alone decides prices.
 */

export const PROMO_CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;

/** Codes are stored upper-case and typed in any case. */
export function normalizePromoCode(raw: unknown): string {
	return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

export type DiscountType = 'PERCENT' | 'FIXED';

export interface PromoPricing {
	/** The course's price before the code: its discount price when it has a real one. */
	price: string;
	discountAmount: string;
	/** What is left to pay; never below zero. */
	amountDue: string;
}

/** Decimal strings → whole cents, so no step of the arithmetic happens in floating point. */
function toCents(value: string | number): number {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount < 0) return 0;
	return Math.round(amount * 100);
}

const fromCents = (cents: number) => (cents / 100).toFixed(2);

/**
 * What a code takes off a price. A percentage rounds to the nearest cent (half up); a fixed amount
 * is capped at the price, so a 500 ETB code on a 300 ETB course makes it free rather than negative.
 */
export function promoPricing(price: string | number, type: DiscountType, value: string | number): PromoPricing {
	const priceCents = toCents(price);
	const raw =
		type === 'PERCENT'
			? Math.round((priceCents * Math.min(Math.max(Number(value) || 0, 0), 100)) / 100)
			: toCents(value);
	const discountCents = Math.min(raw, priceCents);
	return {
		price: fromCents(priceCents),
		discountAmount: fromCents(discountCents),
		amountDue: fromCents(priceCents - discountCents)
	};
}

/** Two money amounts are the same to the cent. */
export function sameAmount(a: string | number, b: string | number): boolean {
	const x = Number(a);
	const y = Number(b);
	return Number.isFinite(x) && Number.isFinite(y) && Math.round(x * 100) === Math.round(y * 100);
}
