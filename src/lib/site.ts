import { localizePath } from '$lib/i18n';

export const siteConfig = {
	name: 'Ethio AI School',
	shortName: 'EAS',
	tagline: 'Digital Construct',
	description: 'Learn with purpose. Build with confidence.'
} as const;

/*
 * Route paths for the public site and the student area. Every path comes back in the locale of
 * the page being rendered ("/courses" in English, "/am/courses" in Amharic), so links, redirects
 * and `goto` stay in the visitor's language without each caller localizing. The dashboard is
 * English-only and never localized.
 */
const l = (path: string) => localizePath(path);

export const ROUTES = {
	get home() { return l('/'); },
	get forbidden() { return l('/403'); },
	get about() { return l('/about'); },
	get pricing() { return l('/pricing'); },
	get contact() { return l('/contact'); },
	get faq() { return l('/faq'); },
	get helpCenter() { return l('/help-center'); },
	get privacyPolicy() { return l('/privacy-policy'); },
	get terms() { return l('/terms'); },
	get cookiePolicy() { return l('/cookie-policy'); },
	instructors: {
		get list() { return l('/instructors'); },
		detail: (slug: string) => l(`/instructors/${slug}`)
	},
	courses: {
		get list() { return l('/courses'); },
		detail: (slug: string) => l(`/courses/${slug}`)
	},
	categories: {
		get list() { return l('/categories'); },
		detail: (slug: string) => l(`/categories/${slug}`)
	},
	certificates: {
		verify: (token: string) => l(`/certificates/verify/${token}`),
		get verifyLookup() { return l('/certificates/verify'); }
	},
	auth: {
		get login() { return l('/login'); },
		get register() { return l('/register'); },
		get forgotPassword() { return l('/forgot-password'); },
		get resetPassword() { return l('/reset-password'); },
		get verifyEmail() { return l('/verify-email'); }
	},
	student: {
		/** The student's home: progress, payments, certificates and notifications at a glance. */
		get home() { return l('/my'); },
		get courses() { return l('/my-courses'); },
		learn: (slug: string, lessonId?: number | string) =>
			l(lessonId === undefined ? `/my-courses/${slug}` : `/my-courses/${slug}?lesson=${lessonId}`),
		get certificates() { return l('/my-certificates'); },
		certificate: (code: string) => l(`/my-certificates/${code}`),
		checkout: (slug: string) => l(`/checkout/${slug}`),
		get account() { return l('/account'); },
		get wishlist() { return l('/my-wishlist'); },
		get payments() { return l('/my-payments'); },
		get notifications() { return l('/my-notifications'); }
	},
	dashboard: '/dashboard'
};
