import { m } from '$lib/paraglide/messages';

export type AuthNotice = { type: 'success' | 'error'; text: string };

/**
 * What the sign-in page says about how the visitor arrived: back from resetting a password, or
 * back from a Google sign-in that failed (better-auth adds `?error=<code>`).
 */
export function loginNotice(params: URLSearchParams): AuthNotice | null {
	if (params.get('reset') === '1') {
		return { type: 'success', text: m.account_notice_reset_done() };
	}
	const error = params.get('error');
	if (!error) return null;
	switch (error) {
		case 'account_not_linked':
		case 'unable_to_link_account':
			return { type: 'error', text: m.account_notice_google_not_linked() };
		case 'access_denied':
			return { type: 'error', text: m.account_notice_google_cancelled() };
		default:
			return { type: 'error', text: m.account_notice_google_failed() };
	}
}
