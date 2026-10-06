import { describe, expect, it, vi } from 'vitest';
import { capSms, postToGeezSms, SMS_API_URL, SMS_LIMIT } from './geez';

/* Never reaches GeezSMS: every call gets a stand-in fetch. */

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const send = (fetchImpl: typeof fetch, extra: { shortcodeId?: string; timeoutMs?: number } = {}) =>
	postToGeezSms({ token: 'test-token', phone: '251912345678', msg: 'Hello', fetchImpl, ...extra });

describe('postToGeezSms', () => {
	it('posts the form fields and reads error: false as sent', async () => {
		const fetchImpl = vi.fn(async () => json({ error: false, msg: 'SMS has been sent successfully.', sms_units: 1 }));
		expect(await send(fetchImpl)).toEqual({ ok: true });

		expect(fetchImpl).toHaveBeenCalledOnce();
		const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(SMS_API_URL);
		expect(init.method).toBe('POST');
		const body = init.body as URLSearchParams;
		expect(Object.fromEntries(body)).toEqual({ token: 'test-token', phone: '251912345678', msg: 'Hello' });
		expect(init.signal).toBeInstanceOf(AbortSignal);
	});

	it('adds shortcode_id only when a sender id is set', async () => {
		const fetchImpl = vi.fn(async () => json({ error: false }));
		await send(fetchImpl, { shortcodeId: '42' });
		const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
		expect(body.get('shortcode_id')).toBe('42');
	});

	it('treats error: true as a failure, with GeezSMS’s own words', async () => {
		const outcome = await send(async () => json({ error: true, msg: 'API Not found' }));
		expect(outcome).toEqual({ ok: false, error: 'GeezSMS: API Not found' });
	});

	it('treats an HTTP error as a failure, even with a readable body', async () => {
		expect(await send(async () => json({ error: false }, 500))).toEqual({ ok: false, error: 'GeezSMS HTTP 500' });
		expect(await send(async () => new Response('<html>Bad gateway</html>', { status: 502 }))).toEqual({
			ok: false,
			error: 'GeezSMS HTTP 502'
		});
	});

	it('does not count an unreadable answer as sent', async () => {
		const outcome = await send(async () => new Response('OK', { status: 200 }));
		expect(outcome).toEqual({ ok: false, error: 'Unexpected answer from GeezSMS (HTTP 200)' });
	});

	it('reports a network error without throwing', async () => {
		const outcome = await send(async () => {
			throw new TypeError('fetch failed');
		});
		expect(outcome).toEqual({ ok: false, error: 'Could not reach GeezSMS: fetch failed' });
	});

	it('gives up when GeezSMS does not answer in time', async () => {
		// Hangs until the request's own timeout aborts it, as a real stalled connection would.
		const hanging: typeof fetch = (_url, init) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
			});
		const outcome = await send(hanging, { timeoutMs: 30 });
		expect(outcome).toEqual({ ok: false, error: 'GeezSMS did not answer within 1 s' });
	});

	it('never puts the token in an error', async () => {
		const outcome = await send(async () => json({ error: true, msg: 'Bad request' }, 400));
		expect(JSON.stringify(outcome)).not.toContain('test-token');
	});
});

describe('capSms', () => {
	it('leaves a short message alone', () => {
		expect(capSms('Hello there')).toBe('Hello there');
		const exact = 'x'.repeat(SMS_LIMIT);
		expect(capSms(exact)).toBe(exact);
	});

	it('trims on a word boundary with an ellipsis', () => {
		const out = capSms(`${'word '.repeat(80)}end`);
		expect(out.length).toBeLessThanOrEqual(SMS_LIMIT);
		expect(out.endsWith('word…')).toBe(true);
	});

	it('cuts a long unbroken run rather than losing most of the message', () => {
		const out = capSms(`Go ${'a'.repeat(400)}`);
		expect(out).toHaveLength(SMS_LIMIT);
		expect(out.endsWith('a…')).toBe(true);
	});
});
