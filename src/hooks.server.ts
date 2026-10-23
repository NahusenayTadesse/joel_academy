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
import { isPrivatePath, withSeoTags } from '$lib/server/seo';
import { env } from '$env/dynamic/private';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { cookieName } from '$lib/paraglide/runtime';
import { rememberLocale } from '$lib/server/locale';
configureKit({ db, loginPath: '/login' });
// SvelteKit's boot script fetches and runs the app's JavaScript as soon as the HTML is parsed, in
// competition with the stylesheet and fonts. The page is server-rendered and readable without it,
// so the boot waits one frame: the browser paints first, then hydrates (one frame, ~16 ms, later).
const BOOT = /Promise\.all\(\[\s*import\("[^"]+\/entry\/start\.[^"]+"\),\s*import\("[^"]+\/entry\/app\.[^"]+"\)\s*\]\)/;
const paintFirst = (html: string) =>
 html.replace(BOOT, (boot) => `new Promise((painted) => requestAnimationFrame(() => setTimeout(painted))).then(() => ${boot})`);
// The page's language from its address ("/am/…" is Amharic), resolved before anything renders. The
// cookie remembers it for requests that have no page address of their own, such as the auth API
// sending a verification email.
const i18n: Handle = ({ event, resolve }) =>
 paraglideMiddleware(event.request, ({ request, locale }) => {
  if (request.method === 'GET' && event.cookies.get(cookieName) !== locale && !event.url.pathname.startsWith('/api/')) {
   event.cookies.set(cookieName, locale, { path: '/', maxAge: 60 * 60 * 24 * 400, httpOnly: false, sameSite: 'lax' });
  }
  return resolve({ ...event, request }, {
   transformPageChunk: ({ html }) => paintFirst(html.replace('%paraglide.lang%', locale)),
   // Fonts and stylesheets are announced in <head>; scripts are not. Dozens of modulepreload hints
   // compete with the stylesheet for a phone's bandwidth and delay the first paint, while the page
   // is fully readable before any script runs (it is server-rendered). The start script still
   // imports them right after.
   preload: ({ type }) => type === 'css' || type === 'font'
  });
 });
const authenticate: Handle = async ({ event, resolve }) => {
 const session = await auth.api.getSession({ headers: event.request.headers });
 if (session) { event.locals.user = session.user; event.locals.session = session.session; }
 return svelteKitHandler({ event, resolve, auth, building });
};
// Emails and texts sent later (a receipt approved by staff) follow the language the person last used.
const locale: Handle = async ({ event, resolve }) => {
 const lang = event.cookies.get(cookieName);
 if (event.locals.user && event.request.method === 'GET' && (lang === 'en' || lang === 'am')) {
  await rememberLocale(event.locals.user.id, lang);
 }
 return resolve(event);
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
 if (event.request.method !== 'GET' || isPrivatePath(event.url.pathname)) return resolve(event);
 const origin = (env.ORIGIN || event.url.origin).replace(/\/$/, '');
 return resolve(event, { transformPageChunk: ({ html }) => withSeoTags(html, event.url, origin) });
};
export const handle = sequence(i18n, authenticate, locale, authorize, invalidate, personal, seo);
