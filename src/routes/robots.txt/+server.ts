import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/** Crawlers may read the public site; private, staff and transactional pages are off limits. */
export const GET: RequestHandler = ({ url }) => {
	const origin = (env.ORIGIN || url.origin).replace(/\/$/, '');
	const disallowed = [
		'/dashboard',
		'/api/',
		'/account',
		'/my',
		'/my-courses',
		'/my-certificates',
		'/checkout',
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/verify-email',
		'/offline',
		'/certificates/verify/'
	];
	const body = ['User-agent: *', 'Allow: /', ...disallowed.map((path) => `Disallow: ${path}`), '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
