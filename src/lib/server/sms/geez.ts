/*
 * The GeezSMS API, as the academy's other project uses it: a form POST of token, phone and msg
 * (plus an optional sender id). A successful send answers `{ error: false, msg: "SMS has been sent
 * successfully.", … }`; a failure answers `error: true` (an unknown token: `{ error: true, msg:
 * "API Not found" }`).
 */

export const SMS_API_URL = 'https://api.geezsms.com/api/v1/sms/send';

/** GeezSMS rejects anything longer than this. */
export const SMS_LIMIT = 335;

/**
 * Trims a message to the SMS limit on a word boundary, with an ellipsis. A message ending in "…"
 * reads as shortened; one that stops mid-word reads as broken.
 */
export function capSms(msg: string, limit = SMS_LIMIT): string {
	if (msg.length <= limit) return msg;
	const clipped = msg.slice(0, limit - 1);
	// Back up to a boundary only if one is close, or a long unbroken run (a URL) would lose most of it.
	const boundary = Math.max(clipped.lastIndexOf(' '), clipped.lastIndexOf('\n'));
	return (boundary > limit - 40 ? clipped.slice(0, boundary) : clipped).trimEnd() + '…';
}

export type GeezOutcome = { ok: true } | { ok: false; error: string };

const messageOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

/** Posts one text. Never throws; the token never appears in what it returns. */
export async function postToGeezSms({
	token,
	phone,
	msg,
	shortcodeId,
	timeoutMs = 10_000,
	fetchImpl = fetch
}: {
	token: string;
	/** Already normalised: 2519… or 2517…. */
	phone: string;
	msg: string;
	/** A sender id registered with GeezSMS; the account default when absent. */
	shortcodeId?: string | null;
	timeoutMs?: number;
	fetchImpl?: typeof fetch;
}): Promise<GeezOutcome> {
	const body = new URLSearchParams({ token, phone, msg });
	if (shortcodeId) body.set('shortcode_id', shortcodeId);

	let response: Response;
	let text: string;
	try {
		response = await fetchImpl(SMS_API_URL, { method: 'POST', body, signal: AbortSignal.timeout(timeoutMs) });
		text = await response.text();
	} catch (cause) {
		if (cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError')) {
			return { ok: false, error: `GeezSMS did not answer within ${Math.max(1, Math.round(timeoutMs / 1000))} s` };
		}
		return { ok: false, error: `Could not reach GeezSMS: ${messageOf(cause)}` };
	}

	let data: { error?: unknown; msg?: unknown; message?: unknown; message_status?: unknown } | null = null;
	try {
		const parsed: unknown = JSON.parse(text);
		if (parsed && typeof parsed === 'object') data = parsed;
	} catch {
		// Handled below: an answer we cannot read is not a confirmed send.
	}

	const said = typeof data?.msg === 'string' ? data.msg : typeof data?.message === 'string' ? data.message : '';
	if (response.status >= 400) {
		return { ok: false, error: `GeezSMS HTTP ${response.status}${said ? `: ${said}` : ''}` };
	}
	if (!data) return { ok: false, error: `Unexpected answer from GeezSMS (HTTP ${response.status})` };
	// `message_status` is honoured in case an older account shape returns it.
	if (data.error === true || data.message_status === 'failed') {
		return { ok: false, error: `GeezSMS: ${said || 'send refused'}` };
	}
	return { ok: true };
}
