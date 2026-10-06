import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { sameAmount } from '$lib/promo';

/*
 * Chapa's hosted checkout: `initializeChapa` opens a payment and returns the page to send the
 * student to; `verifyChapa` asks Chapa whether a payment went through. Verify is the only proof of
 * payment this app accepts — a redirect back, a webhook body, anything the browser says, is only a
 * prompt to ask. Settling lives in `chapa-settlement.ts`.
 */

const CHAPA_API = 'https://api.chapa.co/v1';
const TIMEOUT_MS = 15_000;

/** Online payment is offered only when a secret key is configured. */
export function chapaEnabled(): boolean {
	return Boolean(env.CHAPA_SECRET_KEY);
}

/** Our reference for one payment attempt: `jta-` and 24 random characters. */
export function newTxRef(): string {
	return `jta-${randomBytes(18).toString('base64url')}`;
}

export const TX_REF_PATTERN = /^jta-[A-Za-z0-9_-]{8,59}$/;

/** Chapa accepts letters, digits, spaces, dots, hyphens and underscores, and only so many. */
export function chapaText(value: string, max: number, fallback: string): string {
	const cleaned = value
		.replace(/[^a-zA-Z0-9 ._-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max)
		.trim();
	return cleaned || fallback;
}

/** "Selam Tesfaye Bekele" → Selam / Tesfaye Bekele; one word → that word twice (both are required). */
export function splitName(name: string): { firstName: string; lastName: string } {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const firstName = parts[0] ?? 'Student';
	return { firstName, lastName: parts.slice(1).join(' ') || firstName };
}

export class ChapaError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ChapaError';
	}
}

function secret(): string {
	const key = env.CHAPA_SECRET_KEY;
	if (!key) throw new ChapaError('Online payment is not configured.');
	return key;
}

/** Chapa's `message` is a string, or field → messages when validation failed. */
function describe(message: unknown): string {
	if (typeof message === 'string') return message;
	if (message && typeof message === 'object')
		return Object.entries(message)
			.map(([field, list]) => `${field}: ${([] as unknown[]).concat(list).join(', ')}`)
			.join('; ');
	return 'Unknown error';
}

export interface InitializeInput {
	txRef: string;
	amount: string;
	currency: string;
	email: string;
	name: string;
	callbackUrl: string;
	returnUrl: string;
	title: string;
	description: string;
}

/** Opens a Chapa checkout and returns its URL. Throws `ChapaError` when Chapa refuses. */
export async function initializeChapa(input: InitializeInput): Promise<string> {
	const { firstName, lastName } = splitName(input.name);
	const body = {
		amount: input.amount,
		currency: input.currency,
		email: input.email,
		first_name: chapaText(firstName, 50, 'Student'),
		last_name: chapaText(lastName, 50, 'Student'),
		tx_ref: input.txRef,
		callback_url: input.callbackUrl,
		return_url: input.returnUrl,
		customization: {
			title: chapaText(input.title, 16, 'Course payment'),
			description: chapaText(input.description, 50, 'Course enrollment')
		}
	};

	const send = async (payload: object) => {
		const response = await fetch(`${CHAPA_API}/transaction/initialize`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		const data = (await response.json().catch(() => null)) as {
			status?: string;
			message?: unknown;
			data?: { checkout_url?: string };
		} | null;
		return { ok: response.ok && data?.status === 'success', data };
	};

	let result = await send(body);
	// Chapa checks addresses more strictly than sign-up does; the email is optional, so retry without.
	const refused = result.data?.message;
	if (!result.ok && refused && typeof refused === 'object' && 'email' in refused) {
		const { email: _omitted, ...withoutEmail } = body;
		result = await send(withoutEmail);
	}
	const url = result.data?.data?.checkout_url;
	if (!result.ok || !url) throw new ChapaError(describe(result.data?.message));
	return url;
}

/** The parts of Chapa's verify answer settlement looks at. */
export interface ChapaVerification {
	/** Whether Chapa answered the question at all (a 2xx with `status: success`). */
	found: boolean;
	/** The payment's own state: `success`, `pending`, `failed`, … */
	status: string | null;
	amount: string | null;
	currency: string | null;
	txRef: string | null;
	reference: string | null;
	message: string;
}

/**
 * Asks Chapa about a payment. Throws only when Chapa could not be reached or answered with a
 * server error — a retry may help then. "No such reference" comes back as `found: false`.
 */
export async function verifyChapa(txRef: string): Promise<ChapaVerification> {
	const response = await fetch(`${CHAPA_API}/transaction/verify/${encodeURIComponent(txRef)}`, {
		headers: { Authorization: `Bearer ${secret()}` },
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	// Our key refused, rate limited, or Chapa down: nothing is known about the payment yet.
	if (response.status >= 500 || [401, 403, 429].includes(response.status))
		throw new ChapaError(`Chapa answered ${response.status}`);
	const body = (await response.json().catch(() => null)) as {
		status?: string;
		message?: unknown;
		data?: Record<string, unknown> | null;
	} | null;
	if (!body) throw new ChapaError('Chapa sent an unreadable answer');
	const data = body.data ?? null;
	const text = (value: unknown) => (value === null || value === undefined ? null : String(value));
	return {
		found: response.ok && body.status === 'success' && data !== null,
		status: text(data?.status)?.toLowerCase() ?? null,
		amount: text(data?.amount),
		currency: text(data?.currency),
		txRef: text(data?.tx_ref),
		reference: text(data?.reference),
		message: describe(body.message)
	};
}

/**
 * Whether a webhook body carries Chapa's signature: HMAC-SHA256 of the raw body under the webhook
 * secret, as hex. A filter against noise only — settlement still asks the verify API.
 */
export function chapaSignatureValid(rawBody: string, signature: string | null, secret: string): boolean {
	if (!signature) return false;
	const want = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
	const given = Buffer.from(signature.trim().toLowerCase());
	return given.length === want.length && timingSafeEqual(given, want);
}

export type Judgement =
	| { outcome: 'paid'; reference: string | null }
	| { outcome: 'failed'; reason: string }
	| { outcome: 'pending'; reason: string };

const FAILED_STATES = new Set(['failed', 'failure', 'cancelled', 'canceled', 'reversed', 'refunded', 'expired']);

/** What Chapa's verify answer means for the payment we expected. Pure, so it is unit-tested. */
export function judgeVerification(
	expected: { txRef: string; amount: string; currency: string },
	verification: ChapaVerification
): Judgement {
	if (!verification.found) {
		return /invalid transaction reference|not found/i.test(verification.message)
			? { outcome: 'failed', reason: 'Chapa has no record of this payment.' }
			: { outcome: 'pending', reason: `Chapa could not confirm the payment yet (${verification.message}).` };
	}
	const state = verification.status ?? '';
	if (FAILED_STATES.has(state)) return { outcome: 'failed', reason: `Chapa reported the payment as ${state}.` };
	if (state !== 'success') return { outcome: 'pending', reason: 'The payment is not confirmed yet.' };

	if (verification.txRef !== null && verification.txRef !== expected.txRef)
		return { outcome: 'failed', reason: `Chapa confirmed a different reference (${verification.txRef}).` };
	if ((verification.currency ?? '').toUpperCase() !== expected.currency.toUpperCase())
		return {
			outcome: 'failed',
			reason: `Paid in ${verification.currency ?? 'an unknown currency'}, expected ${expected.currency}. Needs staff review.`
		};
	if (verification.amount === null || !sameAmount(verification.amount, expected.amount))
		return {
			outcome: 'failed',
			reason: `Paid ${verification.amount ?? 'an unknown amount'} ${expected.currency}, expected ${expected.amount}. Needs staff review.`
		};
	return { outcome: 'paid', reference: verification.reference };
}
