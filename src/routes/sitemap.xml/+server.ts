import { env } from '$env/dynamic/private';
import { listCategories, listCourses, listInstructors } from '$lib/server/public-catalog';
import { ROUTES } from '$lib/site';
import type { RequestHandler } from './$types';

const STATIC_PAGES: { path: string; priority: string; changefreq: string }[] = [
	{ path: ROUTES.home, priority: '1.0', changefreq: 'daily' },
	{ path: ROUTES.courses.list, priority: '0.9', changefreq: 'daily' },
	{ path: ROUTES.categories.list, priority: '0.7', changefreq: 'weekly' },
	{ path: ROUTES.instructors.list, priority: '0.6', changefreq: 'weekly' },
	{ path: ROUTES.pricing, priority: '0.6', changefreq: 'monthly' },
	{ path: ROUTES.about, priority: '0.5', changefreq: 'monthly' },
	{ path: ROUTES.contact, priority: '0.5', changefreq: 'yearly' },
	{ path: ROUTES.faq, priority: '0.5', changefreq: 'monthly' },
	{ path: ROUTES.helpCenter, priority: '0.4', changefreq: 'monthly' },
	{ path: ROUTES.certificates.verifyLookup, priority: '0.4', changefreq: 'yearly' },
	{ path: ROUTES.privacyPolicy, priority: '0.2', changefreq: 'yearly' },
	{ path: ROUTES.terms, priority: '0.2', changefreq: 'yearly' },
	{ path: ROUTES.cookiePolicy, priority: '0.2', changefreq: 'yearly' }
];

const xml = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Every public page, every published course, category and instructor. */
export const GET: RequestHandler = async ({ url }) => {
	const origin = (env.ORIGIN || url.origin).replace(/\/$/, '');
	const [courses, categories, instructors] = await Promise.all([
		listCourses({ pageSize: 10_000, sort: 'newest' }),
		listCategories(),
		listInstructors()
	]);

	const entry = (path: string, extra: { lastmod?: string | null; priority?: string; changefreq?: string } = {}) =>
		[
			'<url>',
			`<loc>${xml(`${origin}${path}`)}</loc>`,
			extra.lastmod ? `<lastmod>${extra.lastmod.slice(0, 10)}</lastmod>` : '',
			extra.changefreq ? `<changefreq>${extra.changefreq}</changefreq>` : '',
			extra.priority ? `<priority>${extra.priority}</priority>` : '',
			'</url>'
		].join('');

	const urls = [
		...STATIC_PAGES.map(({ path, ...extra }) => entry(path, extra)),
		...courses.items.map((course) =>
			entry(ROUTES.courses.detail(course.slug), { lastmod: course.publishedAt, priority: '0.8', changefreq: 'weekly' })
		),
		...categories.map((category) => entry(ROUTES.categories.detail(category.slug), { priority: '0.6', changefreq: 'weekly' })),
		...instructors.map((instructor) =>
			entry(ROUTES.instructors.detail(instructor.slug ?? ''), { priority: '0.5', changefreq: 'monthly' })
		)
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`;
	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	});
};
