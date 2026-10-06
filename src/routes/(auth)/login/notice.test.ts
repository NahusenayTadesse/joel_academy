import { describe, expect, it } from 'vitest';
import { loginNotice } from './notice';

const notice = (query: string) => loginNotice(new URLSearchParams(query));

describe('loginNotice', () => {
	it('says nothing on a plain visit', () => {
		expect(notice('')).toBeNull();
		expect(notice('redirectTo=%2Fmy-courses')).toBeNull();
	});

	it('confirms a password reset', () => {
		expect(notice('reset=1')).toMatchObject({ type: 'success' });
	});

	it('explains an unlinked Google account', () => {
		expect(notice('error=account_not_linked')?.text).toMatch(/confirm your email/);
	});

	it('falls back to a general Google failure for any other code', () => {
		expect(notice('error=state_not_found')?.text).toMatch(/Google sign-in didn't complete/);
		expect(notice('error=access_denied')?.text).toMatch(/cancelled/);
	});
});
