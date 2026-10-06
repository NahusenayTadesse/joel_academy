export const siteConfig = {
	name: 'Joel Talargie Academy',
	shortName: 'JTA',
	tagline: 'Digital Construct',
	description: 'Learn with purpose. Build with confidence.'
} as const;

/** Route paths for the public site and the student area. */
export const ROUTES = {
	home: '/',
	forbidden: '/403',
	about: '/about',
	pricing: '/pricing',
	contact: '/contact',
	faq: '/faq',
	helpCenter: '/help-center',
	privacyPolicy: '/privacy-policy',
	terms: '/terms',
	cookiePolicy: '/cookie-policy',
	instructors: { list: '/instructors', detail: (slug: string) => `/instructors/${slug}` },
	courses: { list: '/courses', detail: (slug: string) => `/courses/${slug}` },
	categories: { list: '/categories', detail: (slug: string) => `/categories/${slug}` },
	certificates: {
		verify: (token: string) => `/certificates/verify/${token}`,
		verifyLookup: '/certificates/verify'
	},
	auth: {
		login: '/login',
		register: '/register',
		forgotPassword: '/forgot-password',
		resetPassword: '/reset-password',
		verifyEmail: '/verify-email'
	},
	student: {
		courses: '/my-courses',
		learn: (slug: string, lessonId?: number | string) =>
			lessonId === undefined ? `/my-courses/${slug}` : `/my-courses/${slug}?lesson=${lessonId}`,
		certificates: '/my-certificates',
		certificate: (code: string) => `/my-certificates/${code}`,
		checkout: (slug: string) => `/checkout/${slug}`,
		account: '/account'
	},
	dashboard: '/dashboard'
} as const;
