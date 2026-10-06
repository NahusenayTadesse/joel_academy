/*
 * Ethiopian mobile numbers, shared by the server (sending, storing) and the pages (showing).
 * Stored and sent in GeezSMS's international form without the plus: 2519… (Ethio Telecom) or
 * 2517… (Safaricom), 12 digits.
 */

export interface PhoneValidationResult {
	isValid: boolean;
	formattedPhone: string | null;
	error?: string;
}

/**
 * Normalises an Ethiopian mobile number to `2519…`/`2517…` and validates it. Accepts
 * `0912345678`, `0712345678`, `+251912345678`, `251912345678`, `912345678`, with any spaces,
 * dashes or brackets.
 */
export function formatAndValidateEthPhone(phone: string | null | undefined): PhoneValidationResult {
	if (!phone || !phone.trim()) {
		return { isValid: false, formattedPhone: null, error: 'Phone number is empty' };
	}

	let cleaned = phone.replace(/\D/g, '');

	// Local form: 09… / 07… → 2519… / 2517…
	if (cleaned.startsWith('0')) {
		cleaned = '251' + cleaned.slice(1);
	}
	// Nine digits without the leading zero: 912345678
	else if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('7'))) {
		cleaned = '251' + cleaned;
	}

	if (!/^251(9|7)\d{8}$/.test(cleaned)) {
		return {
			isValid: false,
			formattedPhone: null,
			error: 'Invalid Ethiopian mobile number (must start with 2519 or 2517 and be 12 digits total)'
		};
	}

	return { isValid: true, formattedPhone: cleaned };
}

/** The normalised number, or null. */
export function normalizeEthPhone(phone: string | null | undefined): string | null {
	return formatAndValidateEthPhone(phone).formattedPhone;
}

/** Whether `phone` is already in the stored `2519…`/`2517…` form, exactly. */
export function isNormalizedEthPhone(phone: string): boolean {
	return normalizeEthPhone(phone) === phone;
}

/** `251912345678` → `0912 345 678`, the way people write it. Anything else is returned as is. */
export function localPhone(phone: string): string {
	if (!/^251[79]\d{8}$/.test(phone)) return phone;
	const local = `0${phone.slice(3)}`;
	return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** `251912345678` → `2519•••••678`: enough to tell numbers apart in a log, not to dial one. */
export function maskPhone(phone: string): string {
	if (phone.length <= 7) return phone.replace(/\d(?=\d{2})/g, '•');
	return `${phone.slice(0, 4)}${'•'.repeat(phone.length - 7)}${phone.slice(-3)}`;
}
