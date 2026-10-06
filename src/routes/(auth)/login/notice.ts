export type AuthNotice = { type: 'success' | 'error'; text: string };

/**
 * What the sign-in page says about how the visitor arrived: back from resetting a password, or
 * back from a Google sign-in that failed (better-auth adds `?error=<code>`).
 */
export function loginNotice(params: URLSearchParams): AuthNotice | null {
	if (params.get('reset') === '1') {
		return { type: 'success', text: 'Password reset successfully. Sign in with your new password.' };
	}
	const error = params.get('error');
	if (!error) return null;
	switch (error) {
		case 'account_not_linked':
		case 'unable_to_link_account':
			return {
				type: 'error',
				text: 'This email already has an account. Sign in with your password and confirm your email from My Courses; Google sign-in works after that.'
			};
		case 'access_denied':
			return { type: 'error', text: 'Google sign-in was cancelled.' };
		default:
			return {
				type: 'error',
				text: "Google sign-in didn't complete. Try again, or sign in with your email and password."
			};
	}
}
