import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { configureKit } from '@nahu/admin-kit/server/db';
import { kitHandle } from '@nahu/admin-kit/server/hooks';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { staffRole } from '$lib/server/db/schema';
import { access } from '$lib/access';
import { roleGrant } from '$lib/permissions';
import { invalidateCatalog } from '$lib/server/public-catalog';
import { PRIVATE_PATHS, withSeoTags } from '$lib/server/seo';
import { env } from '$env/dynamic/private';
configureKit({ db, loginPath: '/login' });
const authenticate: Handle = async ({ event, resolve }) => {
 const session = await auth.api.getSession({ headers: event.request.headers });
 if (session) { event.locals.user = session.user; event.locals.session = session.session; }
 return svelteKitHandler({ event, resolve, auth, building });
};
const authorize = kitHandle({ access, permissions: async ({ locals }) => {
 if (!locals.user) return roleGrant();
 const [grant] = await db.select().from(staffRole).where(eq(staffRole.userId, locals.user.id));
 return roleGrant(grant?.role);
} });
// Any dashboard write may change what the public catalog shows (courses, categories, instructors,
// enrollments behind student counts), so drop the cached snapshot after one.
const invalidate: Handle = async ({ event, resolve }) => {
 const response = await resolve(event);
 if (!['GET','HEAD'].includes(event.request.method) && event.url.pathname.startsWith('/dashboard')) invalidateCatalog();
 return response;
};
// A page rendered for a signed-in person is theirs alone: no shared cache (or the offline service
// worker) may keep it for the next visitor on the same device.
const personal: Handle = async ({ event, resolve }) => {
 const response = await resolve(event);
 if (event.locals.user && !response.headers.has('cache-control')) response.headers.set('cache-control', 'private, no-cache');
 return response;
};
// Public pages get their canonical URL and share-card tags filled in (see $lib/server/seo).
const seo: Handle = ({ event, resolve }) => {
 if (event.request.method !== 'GET' || PRIVATE_PATHS.test(event.url.pathname)) return resolve(event);
 const origin = (env.ORIGIN || event.url.origin).replace(/\/$/, '');
 return resolve(event, { transformPageChunk: ({ html }) => withSeoTags(html, event.url, origin) });
};
export const handle = sequence(authenticate, authorize, invalidate, personal, seo);
