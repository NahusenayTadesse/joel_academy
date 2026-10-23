import { error, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth, googleEnabled } from '$lib/server/auth';
import { m } from '$lib/paraglide/messages';
import { safeRedirectPath } from '$lib/safe-redirect';
import { ROUTES } from '$lib/site';
import type { RequestHandler } from './$types';

/**
 * Starts Google sign-in. Google returns to `/api/auth/callback/google`, which signs the visitor
 * in and comes back to the sign-in page; that page forwards a signed-in visitor home (staff to the
 * dashboard), or shows why Google sign-in failed.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	if (!googleEnabled) error(404, m.account_google_not_setup());

	const target = safeRedirectPath(String((await request.formData()).get('redirectTo') ?? ''), url.origin);
	const login = ROUTES.auth.login;
	const back = target ? `${login}?redirectTo=${encodeURIComponent(target)}` : login;

	let authorizeUrl: string | undefined;
	try {
		// The sveltekitCookies plugin sets the OAuth state cookie on this response.
		const result = await auth.api.signInSocial({
			body: { provider: 'google', callbackURL: back, newUserCallbackURL: back, errorCallbackURL: back },
			headers: request.headers
		});
		authorizeUrl = result.url;
	} catch (err) {
		if (!(err instanceof APIError)) throw err;
		console.error('Google sign-in could not start:', err.body?.message ?? err.message);
	}
	redirect(303, authorizeUrl ?? `${back}${back.includes('?') ? '&' : '?'}error=google`);
};
