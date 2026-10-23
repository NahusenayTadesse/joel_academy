import { m } from '$lib/paraglide/messages';

/**
 * Payment receipts: a photo or a PDF. The kit's store takes more (audio, video, text), so this is
 * the narrower gate a receipt passes first. The browser's declared type is what the store keys
 * the served extension on, so it is the thing checked here too.
 */
export const RECEIPT_TYPES = [
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/avif',
	'image/heic',
	'image/heif',
	'application/pdf'
] as const;

export const RECEIPT_ACCEPT = RECEIPT_TYPES.join(',');

/** Why this file cannot be a receipt, or `null` if it can. */
export function receiptProblem(file: { size: number; type: string } | null | undefined, maxBytes: number): string | null {
	if (!file || file.size === 0) return m.account_receipt_missing();
	if (!(RECEIPT_TYPES as readonly string[]).includes(file.type.toLowerCase()))
		return m.account_receipt_type();
	if (file.size > maxBytes) return m.account_receipt_too_large({ size: formatFileSize(maxBytes) });
	return null;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '')} MB`;
}
