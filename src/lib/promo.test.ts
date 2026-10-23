import { describe, expect, it } from 'vitest';
import { normalizePromoCode, PROMO_CODE_PATTERN, promoPricing, sameAmount } from './promo';

describe('promoPricing', () => {
	it('takes a percentage off, rounded to the cent', () => {
		expect(promoPricing('19.99', 'PERCENT', 15)).toEqual({ price: '19.99', discountAmount: '3.00', amountDue: '16.99' });
		expect(promoPricing('100.00', 'PERCENT', '12.5')).toEqual({ price: '100.00', discountAmount: '12.50', amountDue: '87.50' });
		expect(promoPricing('0.05', 'PERCENT', 50).discountAmount).toBe('0.03');
	});
	it('makes a course free at 100% and never goes past it', () => {
		expect(promoPricing('59.99', 'PERCENT', 100)).toEqual({ price: '59.99', discountAmount: '59.99', amountDue: '0.00' });
		expect(promoPricing('59.99', 'PERCENT', 150).amountDue).toBe('0.00');
	});
	it('takes a fixed amount off, capped at the price', () => {
		expect(promoPricing('49.99', 'FIXED', '10')).toEqual({ price: '49.99', discountAmount: '10.00', amountDue: '39.99' });
		expect(promoPricing('49.99', 'FIXED', '500')).toEqual({ price: '49.99', discountAmount: '49.99', amountDue: '0.00' });
	});
	it('treats nonsense as no discount, never a negative price', () => {
		expect(promoPricing('20.00', 'FIXED', -5).amountDue).toBe('20.00');
		expect(promoPricing('20.00', 'PERCENT', 'abc').amountDue).toBe('20.00');
		expect(promoPricing('-3', 'FIXED', 1).amountDue).toBe('0.00');
	});
	it('works in cents, not floats', () => {
		// 0.1 + 0.2 style drift would show here.
		expect(promoPricing('0.30', 'FIXED', '0.10').amountDue).toBe('0.20');
		expect(promoPricing('1.15', 'PERCENT', 10).amountDue).toBe('1.03');
	});
});

describe('promo codes', () => {
	it('normalises to upper case and accepts only the allowed characters', () => {
		expect(normalizePromoCode('  welcome-15 ')).toBe('WELCOME-15');
		expect(normalizePromoCode(null)).toBe('');
		expect(PROMO_CODE_PATTERN.test('WELCOME_15')).toBe(true);
		for (const bad of ['AB', 'HAS SPACE', 'EMOJI😀', 'A'.repeat(41), 'semi;colon']) expect(PROMO_CODE_PATTERN.test(bad)).toBe(false);
	});
	it('compares money to the cent', () => {
		expect(sameAmount('19.99', 19.99)).toBe(true);
		expect(sameAmount('19.99', '19.98')).toBe(false);
		expect(sameAmount('x', 1)).toBe(false);
	});
});
