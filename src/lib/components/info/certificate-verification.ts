export interface CertificateVerification {
	state: 'VALID' | 'REVOKED' | 'INVALID';
	certificateNumber?: string;
	studentName?: string;
	courseTitle?: string;
	completionDate?: string;
	issuedAt?: string;
}

/**
 * Extracts a certificate verification token or certificate code from raw input or QR contents.
 * Supports:
 * - Full verification URLs: `https://.../certificates/verify/<token>`
 * - Query URLs: `https://.../certificates/verify?token=<token>` or `?code=<code>`
 * - Direct token / certificate code: `EAS-2026-...` or high-entropy verification tokens
 */
export function extractVerificationIdentifier(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';

	if (/^https?:\/\//i.test(trimmed)) {
		try {
			const url = new URL(trimmed);
			const queryToken =
				url.searchParams.get('token') || url.searchParams.get('code') || url.searchParams.get('q');
			if (queryToken) return queryToken.trim();

			const pathSegments = url.pathname.split('/').filter(Boolean);
			const verifyIdx = pathSegments.findIndex((s) => s.toLowerCase() === 'verify');
			const nextSegment = verifyIdx !== -1 ? pathSegments[verifyIdx + 1] : undefined;
			if (nextSegment) return decodeURIComponent(nextSegment).trim();
		} catch {
			// Not a parseable URL after all - fall through to the raw string.
		}
	}

	const queryMatch = trimmed.match(/[?&](?:token|code|q)=([^&#]+)/i);
	if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim();

	return trimmed;
}
