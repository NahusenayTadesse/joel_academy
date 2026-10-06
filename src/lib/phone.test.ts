import { describe, expect, it } from 'vitest';
import { formatAndValidateEthPhone, isNormalizedEthPhone, localPhone, maskPhone, normalizeEthPhone } from './phone';

describe('formatAndValidateEthPhone', () => {
	it.each([
		['0912345678', '251912345678'],
		['0712345678', '251712345678'],
		['+251912345678', '251912345678'],
		['251912345678', '251912345678'],
		['912345678', '251912345678'],
		['712345678', '251712345678'],
		['+251 91 234 5678', '251912345678'],
		['(091) 234-5678', '251912345678']
	])('normalises %s to %s', (input, expected) => {
		expect(formatAndValidateEthPhone(input)).toEqual({ isValid: true, formattedPhone: expected });
	});

	it.each([
		'',
		'   ',
		'0812345678', // not a mobile prefix
		'091234567', // too short
		'09123456789', // too long
		'812345678',
		'+1 202 555 0143',
		'2519123456789',
		'phone'
	])('rejects %j', (input) => {
		const result = formatAndValidateEthPhone(input);
		expect(result.isValid).toBe(false);
		expect(result.formattedPhone).toBeNull();
		expect(result.error).toBeTruthy();
	});

	it('treats null and undefined as empty', () => {
		expect(formatAndValidateEthPhone(null).error).toBe('Phone number is empty');
		expect(formatAndValidateEthPhone(undefined).isValid).toBe(false);
	});
});

describe('normalizeEthPhone / isNormalizedEthPhone', () => {
	it('returns the stored form or null', () => {
		expect(normalizeEthPhone('0912 345 678')).toBe('251912345678');
		expect(normalizeEthPhone('12345')).toBeNull();
	});

	it('accepts only the exact stored form', () => {
		expect(isNormalizedEthPhone('251912345678')).toBe(true);
		expect(isNormalizedEthPhone('0912345678')).toBe(false);
		expect(isNormalizedEthPhone('+251912345678')).toBe(false);
	});
});

describe('localPhone', () => {
	it('writes a stored number the local way', () => {
		expect(localPhone('251912345678')).toBe('0912 345 678');
		expect(localPhone('251712345678')).toBe('0712 345 678');
	});

	it('leaves anything else alone', () => {
		expect(localPhone('12345')).toBe('12345');
	});
});

describe('maskPhone', () => {
	it('hides the middle digits', () => {
		expect(maskPhone('251912345678')).toBe('2519•••••678');
	});

	it('copes with short or odd values', () => {
		expect(maskPhone('12345')).toBe('•••45');
	});
});
