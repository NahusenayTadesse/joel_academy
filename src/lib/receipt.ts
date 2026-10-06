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
	if (!file || file.size === 0) return 'Upload your payment receipt to continue.';
	if (!(RECEIPT_TYPES as readonly string[]).includes(file.type.toLowerCase()))
		return 'The receipt must be an image (PNG, JPG, WEBP, HEIC) or a PDF.';
	if (file.size > maxBytes) return `The receipt is larger than ${formatFileSize(maxBytes)}. Please compress it and try again.`;
	return null;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '')} MB`;
}
