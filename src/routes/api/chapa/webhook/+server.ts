import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { chapaSignatureValid, TX_REF_PATTERN } from '$lib/server/chapa';
import { settleChapaPayment, type Settlement } from '$lib/server/chapa-settlement';

/*
 * Chapa's server-to-server notice that a payment changed, so a student who closes the tab after
 * paying still gets the course. The signature only filters noise: what settles a payment is
 * `settleChapaPayment` asking Chapa's verify API, so a forged body can at most trigger a lookup.
 *
 * Chapa retries on any non-2xx, so an answer that may change (Chapa unreachable, not confirmed yet)
 * is a 503; one a retry cannot change (unknown reference, a failed or mismatched payment) a 200.
 * JSON bodies pass SvelteKit's CSRF origin check, which only guards form content types.
 */

function answer(txRef: string, outcome: Settlement) {
	if (outcome.status === 'pending' && outcome.retryable)
		return json({ received: true, settled: false }, { status: 503, headers: { 'Retry-After': '60' } });
	if (outcome.status === 'pending') console.warn(`Chapa notice for ${txRef} not settled: ${outcome.reason}`);
	return json({ received: true, settled: outcome.status === 'paid' });
}

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.CHAPA_WEBHOOK_SECRET;
	if (!secret) {
		console.error('CHAPA_WEBHOOK_SECRET is not set; refusing the Chapa webhook.');
		return json({ error: 'Webhook not configured.' }, { status: 503 });
	}

	// The raw bytes: re-serialised JSON would not match what Chapa signed.
	const rawBody = await request.text();
	const signature = request.headers.get('chapa-signature') ?? request.headers.get('x-chapa-signature');
	if (!chapaSignatureValid(rawBody, signature, secret)) return json({ error: 'Invalid signature.' }, { status: 401 });

	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Malformed payload.' }, { status: 400 });
	}
	// Chapa has named the field differently across versions.
	const txRef = [payload.tx_ref, payload.trx_ref, payload.reference].find(
		(value): value is string => typeof value === 'string' && TX_REF_PATTERN.test(value)
	);
	// Not one of ours (another integration on the same account): acknowledge so it is not retried.
	if (!txRef) return json({ received: true, settled: false });

	try {
		return answer(txRef, await settleChapaPayment(txRef));
	} catch (error) {
		console.error('Chapa webhook failed:', error);
		return json({ error: 'Could not process the notice.' }, { status: 500 });
	}
};

/**
 * Chapa also calls `callback_url` with a GET (`?trx_ref=…&status=…`) when a payment completes. The
 * query proves nothing, but it names a payment to verify — and verifying is always safe.
 */
export const GET: RequestHandler = async ({ url }) => {
	const txRef = url.searchParams.get('trx_ref') ?? url.searchParams.get('tx_ref');
	if (!txRef || !TX_REF_PATTERN.test(txRef)) return json({ ok: true });
	try {
		return answer(txRef, await settleChapaPayment(txRef));
	} catch (error) {
		console.error('Chapa callback failed:', error);
		return json({ error: 'Could not process the callback.' }, { status: 500 });
	}
};
