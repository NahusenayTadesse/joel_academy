/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

/*
 * The academy's offline layer. What it caches is decided by what is safe to show again later on
 * this device, possibly to someone else:
 *
 * - The app's own code (fingerprinted, immutable) and icons: precached on install.
 * - Public pages (catalog, course details, about, FAQ, …) and their data: network first, the last
 *   good copy when offline. Never anything behind sign-in — learning pages, checkout, certificates,
 *   the dashboard — and never auth, payment or API traffic: those always go to the network.
 * - Images: cache first, since they never change under the same URL. (Fonts are self-hosted and
 *   part of the app shell.)
 * - Anything else offline: the /offline page.
 */

const sw = self as unknown as ServiceWorkerGlobalScope;

const APP_CACHE = `app-${version}`;
const PAGES_CACHE = 'pages-v1';
const ASSETS_CACHE = 'assets-v1';
const OFFLINE_URL = '/offline';

const PRECACHE = [
	...build,
	...files.filter((file) => /^\/(icons\/|icon\.svg|favicon\.ico|manifest\.webmanifest)/.test(file)),
	OFFLINE_URL
];

/** Paths whose responses may be personal, or that must always reach the server. */
const PRIVATE = [
	/^\/(dashboard|api|login|register|logout|forgot-password|reset-password|verify-email|newsletter)(\/|$)/,
	/^\/(my|my-courses|my-certificates|my-wishlist|my-payments|my-notifications|checkout)(\/|$)/,
	/^\/certificates\/verify(\/|$)/,
	// Lesson attachments: only for students who may open the lesson, and never kept on the device.
	/^\/lesson-files(\/|$)/
];

/** Public pages worth keeping for offline reading. */
const PUBLIC_PAGE =
	/^\/(|courses(\/[^/]+)?|categories(\/[^/]+)?|instructors(\/[^/]+)?|about|pricing|faq|help-center|contact|privacy-policy|terms|cookie-policy|offline)\/?$/;

const MAX_PAGES = 60;
const MAX_ASSETS = 200;

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith('app-') && key !== APP_CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

// The page asks a waiting worker to take over once the visitor agrees to reload.
sw.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') sw.skipWaiting();
});

async function trim(cacheName: string, max: number) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();
	for (const request of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(request);
}

/** Only complete, unredirected, uncached-by-policy responses are worth keeping. */
function cacheable(response: Response) {
	return (
		response.ok &&
		response.type === 'basic' &&
		!response.redirected &&
		!/no-store|private/.test(response.headers.get('cache-control') ?? '')
	);
}

async function networkFirst(request: Request, pathname: string): Promise<Response> {
	const cache = await caches.open(PAGES_CACHE);
	try {
		const response = await fetch(request);
		// A signed-in visitor's render carries their name; the server marks those `private`, and
		// `cacheable` refuses them, so another person on this device never sees it offline.
		if (cacheable(response) && PUBLIC_PAGE.test(pathname.replace(/\/__data\.json$/, ''))) {
			await cache.put(request, response.clone());
			void trim(PAGES_CACHE, MAX_PAGES);
		}
		return response;
	} catch {
		const cached = await cache.match(request, { ignoreSearch: false });
		if (cached) return cached;
		if (request.mode === 'navigate') {
			const offline = await caches.match(OFFLINE_URL);
			if (offline) return offline;
		}
		return new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } });
	}
}

async function cacheFirst(request: Request): Promise<Response> {
	const cache = await caches.open(ASSETS_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) {
		await cache.put(request, response.clone());
		void trim(ASSETS_CACHE, MAX_ASSETS);
	}
	return response;
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.origin !== sw.location.origin) return;

	// The app shell: precached at install.
	if (PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(request)));
		return;
	}

	if (PRIVATE.some((pattern) => pattern.test(url.pathname))) {
		// Private pages still get the offline page instead of the browser's error screen.
		if (request.mode === 'navigate') {
			event.respondWith(
				fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error())
			);
		}
		return;
	}

	if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/media/')) {
		event.respondWith(cacheFirst(request));
		return;
	}

	if (request.mode === 'navigate' || url.pathname.endsWith('/__data.json')) {
		event.respondWith(networkFirst(request, url.pathname));
	}
});
