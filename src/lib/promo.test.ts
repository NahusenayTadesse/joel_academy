import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { normalizePromoCode, PROMO_CODE_PATTERN, promoPricing, sameAmount } from './promo';
import { chapaSignatureValid, chapaText, judgeVerification, splitName, type ChapaVerification } from './server/chapa';

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

describe('Chapa helpers', () => {
	it('sanitises text to what Chapa accepts', () => {
		expect(chapaText('Course: ChatGPT (Systematic) Prompt Engineering for Productivity', 50, 'x')).toBe(
			'Course ChatGPT Systematic Prompt Engineering for P'
		);
		expect(chapaText('Joel Talargie Academy', 16, 'x')).toBe('Joel Talargie Ac');
		expect(chapaText('ስልጠና', 16, 'Course payment')).toBe('Course payment');
	});
	it('splits a name into the two Chapa wants', () => {
		expect(splitName('Selam Tesfaye Bekele')).toEqual({ firstName: 'Selam', lastName: 'Tesfaye Bekele' });
		expect(splitName('Madonna')).toEqual({ firstName: 'Madonna', lastName: 'Madonna' });
	});
	it('checks the webhook signature over the raw body', () => {
		const body = '{"tx_ref":"jta-abc12345","status":"success"}';
		const good = createHmac('sha256', 'shh').update(body).digest('hex');
		expect(chapaSignatureValid(body, good, 'shh')).toBe(true);
		expect(chapaSignatureValid(body, good.toUpperCase(), 'shh')).toBe(true);
		expect(chapaSignatureValid(body + ' ', good, 'shh')).toBe(false);
		expect(chapaSignatureValid(body, good, 'other')).toBe(false);
		expect(chapaSignatureValid(body, null, 'shh')).toBe(false);
		expect(chapaSignatureValid(body, 'short', 'shh')).toBe(false);
	});
});

describe('judgeVerification', () => {
	const expected = { txRef: 'jta-abc12345', amount: '16.99', currency: 'ETB' };
	const answer = (over: Partial<ChapaVerification>): ChapaVerification => ({
		found: true,
		status: 'success',
		amount: '16.99',
		currency: 'ETB',
		txRef: 'jta-abc12345',
		reference: 'APxyz',
		message: 'ok',
		...over
	});

	it('accepts a success for our reference, amount and currency', () => {
		expect(judgeVerification(expected, answer({}))).toEqual({ outcome: 'paid', reference: 'APxyz' });
		expect(judgeVerification(expected, answer({ amount: '16.990' })).outcome).toBe('paid');
	});
	it('refuses a success for the wrong amount, currency or reference', () => {
		expect(judgeVerification(expected, answer({ amount: '1.00' })).outcome).toBe('failed');
		expect(judgeVerification(expected, answer({ amount: '17.00' })).outcome).toBe('failed');
		expect(judgeVerification(expected, answer({ amount: null })).outcome).toBe('failed');
		expect(judgeVerification(expected, answer({ currency: 'USD' })).outcome).toBe('failed');
		expect(judgeVerification(expected, answer({ txRef: 'jta-someone-else' })).outcome).toBe('failed');
	});
	it('waits on a pending payment and fails a failed or cancelled one', () => {
		expect(judgeVerification(expected, answer({ status: 'pending' })).outcome).toBe('pending');
		expect(judgeVerification(expected, answer({ status: 'failed' })).outcome).toBe('failed');
		expect(judgeVerification(expected, answer({ status: 'cancelled' })).outcome).toBe('failed');
	});
	it('fails a reference Chapa has never heard of, and waits on any other refusal', () => {
		expect(judgeVerification(expected, answer({ found: false, message: 'Invalid transaction reference' })).outcome).toBe(
			'failed'
		);
		expect(judgeVerification(expected, answer({ found: false, message: 'Something odd' })).outcome).toBe('pending');
	});
});
