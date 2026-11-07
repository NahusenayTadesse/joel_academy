import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * sendSms with the environment, the database and the network all replaced: nothing is ever sent,
 * whatever the developer's .env holds. `fetch` is stubbed globally and asserted on.
 */

const state = vi.hoisted(() => ({
	env: {} as Record<string, string | undefined>,
	logged: [] as Record<string, unknown>[],
	insertFails: false,
	verdict: { allowed: true } as { allowed: true } | { allowed: false; retryAfter: number; reason: string }
}));

vi.mock('$env/dynamic/private', () => ({ env: state.env }));
vi.mock('$lib/server/db', () => ({
	db: {
		insert: () => ({
			values: async (row: Record<string, unknown>) => {
				if (state.insertFails) throw new Error('database down');
				state.logged.push(row);
			}
		})
	}
}));
vi.mock('./limits', () => ({ smsAllowed: vi.fn(async () => state.verdict) }));

const { sendSms } = await import('./send');

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	for (const key of Object.keys(state.env)) delete state.env[key];
	state.logged.length = 0;
	state.insertFails = false;
	state.verdict = { allowed: true };
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'info').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('sendSms without SMS_KEY', () => {
	it('skips, logs the normalised number and branded message, and never calls the network', async () => {
		const result = await sendSms({ to: '0912 345 678', message: 'Hello', kind: 'test' });
		expect(result).toEqual({ status: 'SKIPPED', error: null });
		expect(fetchMock).not.toHaveBeenCalled();
		expect(state.logged).toEqual([
			{
				to: '251912345678',
				kind: 'test',
				message: 'Ethio AI School: Hello',
				status: 'SKIPPED',
				error: null
			}
		]);
	});

	it('does not brand a message twice', async () => {
		await sendSms({ to: '0912345678', message: 'Ethio AI School code: 123456.', kind: 'otp' });
		expect(state.logged[0].message).toBe('Ethio AI School code: 123456.');
	});
});

describe('sendSms with SMS_KEY', () => {
	beforeEach(() => {
		state.env.SMS_KEY = 'secret-token';
	});

	it('sends and logs SENT', async () => {
		fetchMock.mockResolvedValue(answer({ error: false, msg: 'SMS has been sent successfully.' }));
		const result = await sendSms({ to: '+251712345678', message: 'Hi', kind: 'test' });
		expect(result).toEqual({ status: 'SENT', error: null });
		const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
		expect(body.get('phone')).toBe('251712345678');
		expect(body.get('token')).toBe('secret-token');
		expect(body.has('shortcode_id')).toBe(false);
		expect(state.logged[0]).toMatchObject({ to: '251712345678', status: 'SENT', error: null });
	});

	it('passes the sender id when SMS_SHORTCODE_ID is set', async () => {
		state.env.SMS_SHORTCODE_ID = '7';
		fetchMock.mockResolvedValue(answer({ error: false }));
		await sendSms({ to: '0912345678', message: 'Hi', kind: 'test' });
		expect((fetchMock.mock.calls[0][1]?.body as URLSearchParams).get('shortcode_id')).toBe('7');
	});

	it('logs FAILED when GeezSMS says error: true', async () => {
		fetchMock.mockResolvedValue(answer({ error: true, msg: 'Insufficient balance' }));
		const result = await sendSms({ to: '0912345678', message: 'Hi', kind: 'test' });
		expect(result).toEqual({ status: 'FAILED', error: 'GeezSMS: Insufficient balance' });
		expect(state.logged[0]).toMatchObject({ status: 'FAILED', error: 'GeezSMS: Insufficient balance' });
	});

	it('logs FAILED on HTTP 500 and on a network error, without throwing', async () => {
		fetchMock.mockResolvedValueOnce(new Response('oops', { status: 500 }));
		fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
		expect((await sendSms({ to: '0912345678', message: 'a', kind: 'test' })).status).toBe('FAILED');
		expect((await sendSms({ to: '0912345678', message: 'b', kind: 'test' })).error).toBe(
			'Could not reach GeezSMS: fetch failed'
		);
		expect(state.logged.map((row) => row.status)).toEqual(['FAILED', 'FAILED']);
		expect(JSON.stringify(state.logged)).not.toContain('secret-token');
	});

	it('refuses an invalid number without calling GeezSMS', async () => {
		const result = await sendSms({ to: '0812-345-678', message: 'Hi', kind: 'test' });
		expect(result).toEqual({ status: 'FAILED', error: 'Invalid Ethiopian mobile number' });
		expect(fetchMock).not.toHaveBeenCalled();
		expect(state.logged[0]).toMatchObject({ to: '0812345678', status: 'FAILED' });
	});

	it('skips a text a limit refuses, and says how long to wait', async () => {
		state.verdict = { allowed: false, retryAfter: 42, reason: 'daily limit for this number' };
		const result = await sendSms({ to: '0912345678', message: 'Hi', kind: 'otp' });
		expect(result).toEqual({ status: 'SKIPPED', error: 'Rate limited: daily limit for this number', retryAfter: 42 });
		expect(fetchMock).not.toHaveBeenCalled();
		expect(state.logged[0]).toMatchObject({ status: 'SKIPPED', error: 'Rate limited: daily limit for this number' });
	});

	it('caps a long message to 335 characters', async () => {
		fetchMock.mockResolvedValue(answer({ error: false }));
		await sendSms({ to: '0912345678', message: 'word '.repeat(200), kind: 'test' });
		const msg = (fetchMock.mock.calls[0][1]?.body as URLSearchParams).get('msg') ?? '';
		expect(msg.length).toBeLessThanOrEqual(335);
		expect(msg.endsWith('…')).toBe(true);
	});

	it('still resolves when the log cannot be written', async () => {
		state.insertFails = true;
		fetchMock.mockResolvedValue(answer({ error: false }));
		await expect(sendSms({ to: '0912345678', message: 'Hi', kind: 'test' })).resolves.toEqual({
			status: 'SENT',
			error: null
		});
	});
});
