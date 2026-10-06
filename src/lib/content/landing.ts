import { z } from 'zod/v4';
import { FAQ_ITEMS } from './faq.data';

/*
 * The editable landing page: what /dashboard/landing writes and the home page, announcement bar
 * and FAQ page read. Shared by the server (which stores it) and the browser (the editor validates
 * as you type), so it lives outside `$lib/server`. The defaults are the content the site shipped
 * with, so an empty `site_setting` table renders the site exactly as before.
 */

/** The icons an editor may pick for a value pill or a "why choose us" card. */
export const LANDING_ICONS = [
	'Clock',
	'Users',
	'Award',
	'ShieldCheck',
	'Smartphone',
	'UserPlus',
	'Search',
	'CirclePlay',
	'Sparkles',
	'CircleCheck',
	'Target',
	'Zap',
	'GraduationCap',
	'Star'
] as const;
export type LandingIcon = (typeof LANDING_ICONS)[number];

export const SECTION_KEYS = [
	'hero',
	'valuePills',
	'whyChooseUs',
	'howItWorks',
	'featuredCourses',
	'categories',
	'mentor',
	'stats',
	'pricing',
	'testimonials',
	'certificateVerify',
	'faq',
	'finalCta'
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** A stored upload's name, as `saveUploadedFile` makes it: a UUID and an extension. */
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/i;

/**
 * A link a visitor can safely follow: a path on this site ("/courses", not "//evil.example") or a
 * full https address. Everything else — `javascript:`, `data:`, plain http — is refused.
 */
export function isSafeLink(value: string): boolean {
	if (/[\s\\]/.test(value) || /[\u0000-\u001f]/.test(value)) return false;
	if (/^\/(?!\/)/.test(value)) return true;
	if (!/^https:\/\//i.test(value) || !URL.canParse(value)) return false;
	return new URL(value).protocol === 'https:';
}

const text = (max: number, min = 1) =>
	z
		.string()
		.trim()
		.min(min, min === 1 ? 'Required' : `At least ${min} characters`)
		.max(max, `At most ${max} characters`);

const link = z
	.string()
	.trim()
	.min(1, 'Required')
	.max(500, 'At most 500 characters')
	.refine(isSafeLink, 'Use a path on this site (/courses) or a full https:// link');

const iconItem = z.object({
	icon: z.enum(LANDING_ICONS),
	title: text(80),
	description: text(300)
});

const sections = z.object(
	Object.fromEntries(SECTION_KEYS.map((key) => [key, z.boolean()])) as Record<
		SectionKey,
		z.ZodBoolean
	>
);

export const landingSchema = z.object({
	sections,
	hero: z.object({
		badge: text(60),
		heading: text(120),
		description: text(600),
		primaryCtaText: text(40),
		primaryCtaUrl: link,
		secondaryCtaText: text(40),
		secondaryCtaUrl: link,
		/** A path under /static (the shipped picture) or a stored upload's name. */
		image: z
			.string()
			.trim()
			.max(255)
			.refine(
				(value) => STORED_NAME.test(value) || /^\/images\/[\w./-]+$/.test(value),
				'Upload an image'
			),
		imageAlt: text(160),
		imageCaption: z.string().trim().max(200, 'At most 200 characters')
	}),
	valuePills: z.array(iconItem).max(6, 'At most 6 pills'),
	whyChooseUs: z.array(iconItem).max(8, 'At most 8 cards'),
	howItWorks: z
		.array(z.object({ title: text(80), description: text(300) }))
		.max(8, 'At most 8 steps'),
	mentor: z.object({
		/** An instructor's slug, or '' for whoever is first on the instructors list. */
		instructorSlug: z.string().trim().max(120)
	}),
	finalCta: z.object({
		heading: text(120),
		description: text(400),
		ctaText: text(40),
		ctaUrl: link
	}),
	announcement: z.object({
		enabled: z.boolean(),
		/** Names this announcement in visitors' "dismissed" memory; see `announcementVersion`. */
		id: z
			.string()
			.trim()
			.min(1, 'Required')
			.max(60)
			.regex(/^[a-z0-9-]+$/i, 'Letters, digits and hyphens'),
		text: text(200),
		linkText: z.string().trim().max(60, 'At most 60 characters'),
		linkUrl: z
			.string()
			.trim()
			.max(500)
			.refine((value) => value === '' || isSafeLink(value), 'Use a path (/courses) or an https:// link')
	}),
	faqs: z
		.array(z.object({ question: text(200), answer: text(2000) }))
		.max(60, 'At most 60 questions')
});

export type LandingSettings = z.infer<typeof landingSchema>;
export type LandingHero = LandingSettings['hero'];
export type LandingIconItem = LandingSettings['valuePills'][number];
export type LandingStep = LandingSettings['howItWorks'][number];
export type LandingFinalCta = LandingSettings['finalCta'];
export type LandingAnnouncement = LandingSettings['announcement'];
export type LandingFaq = LandingSettings['faqs'][number];

export const DEFAULT_HERO_IMAGE = '/images/hero/network-abstract.jpg';

export const DEFAULT_LANDING: LandingSettings = {
	sections: Object.fromEntries(SECTION_KEYS.map((key) => [key, true])) as Record<
		SectionKey,
		boolean
	>,
	hero: {
		badge: 'Learn with purpose',
		heading: 'Engineer Your Next Career Move.',
		description:
			'Learn directly from the source. Elite industry experts meticulously designed our structured, self-paced curriculum to deliver elite results with zero fluff. You are not just buying a course; you are investing in a masterclass.',
		primaryCtaText: 'View Curriculum',
		primaryCtaUrl: '/courses',
		secondaryCtaText: 'Create free account',
		secondaryCtaUrl: '/register',
		image: DEFAULT_HERO_IMAGE,
		imageAlt: 'Abstract digital network visualization',
		imageCaption:
			'Real courses. Real instructors. A learning system built to get you hired, promoted, or paid more.'
	},
	valuePills: [
		{
			icon: 'Clock',
			title: 'Self-Paced Learning',
			description: 'Study on your own schedule with lifetime access to every course you enroll in.'
		},
		{
			icon: 'Users',
			title: 'Real Instructors',
			description: 'Courses taught by working professionals, not narrators reading slides.'
		},
		{
			icon: 'Award',
			title: 'Verified Certificates',
			description: 'Finish a certificate-eligible course and show what you learned to employers.'
		}
	],
	whyChooseUs: [
		{
			icon: 'Clock',
			title: 'Learn at your own pace',
			description:
				'Courses are self-paced with full lifetime access, so you can learn on your schedule.'
		},
		{
			icon: 'Award',
			title: 'Earn certificates',
			description: 'Complete eligible courses to earn a certificate of completion you can share.'
		},
		{
			icon: 'ShieldCheck',
			title: 'Vetted instructors',
			description: 'Every course is reviewed before publishing to keep quality high.'
		},
		{
			icon: 'Smartphone',
			title: 'Learn anywhere',
			description: 'A fully responsive experience across desktop, tablet, and mobile.'
		}
	],
	howItWorks: [
		{ title: 'Create an account', description: 'Sign up free in under a minute.' },
		{ title: 'Find a course', description: 'Browse the catalog or search for a topic.' },
		{ title: 'Start learning', description: 'Work through lessons at your own pace.' },
		{ title: 'Get certified', description: 'Finish the course and earn your certificate.' }
	],
	mentor: { instructorSlug: '' },
	finalCta: {
		heading: 'Ready to Start?',
		description:
			'Join for free and get access to our full course catalog today - no credit card required.',
		ctaText: 'Create your free account',
		ctaUrl: '/register'
	},
	announcement: {
		enabled: true,
		id: 'summer-2026-launch',
		text: 'New this month: dozens of courses across cloud, security, and AI.',
		linkText: 'Explore the catalog',
		linkUrl: '/courses'
	},
	faqs: FAQ_ITEMS.map(({ question, answer }) => ({ question, answer }))
};

/** A deep copy of one section's defaults, safe to hand to a form. */
export function defaultSection<K extends keyof LandingSettings>(key: K): LandingSettings[K] {
	return structuredClone(DEFAULT_LANDING[key]);
}

/**
 * Stored settings made whole: each top-level part that fails to parse (an older shape, a hand
 * edit) falls back to its default on its own, so one bad part never blanks the whole page.
 */
export function mergeLanding(stored: unknown): LandingSettings {
	const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
	const merged = structuredClone(DEFAULT_LANDING) as Record<string, unknown>;
	for (const [key, part] of Object.entries(landingSchema.shape)) {
		if (!(key in source)) continue;
		const parsed = (part as z.ZodType).safeParse(source[key]);
		if (parsed.success) merged[key] = parsed.data;
	}
	return merged as LandingSettings;
}

/** A short, stable hash of a string (djb2), for telling one announcement's wording from another. */
function hash(value: string): string {
	let h = 5381;
	for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
	return h.toString(36);
}

/**
 * What a visitor's "dismissed" memory is keyed by. It changes whenever the wording or link does,
 * so editing an announcement shows it again to people who closed the previous one.
 */
export function announcementVersion(a: LandingAnnouncement): string {
	return `${a.id}:${hash([a.text, a.linkText, a.linkUrl].join('\u0001'))}`;
}
