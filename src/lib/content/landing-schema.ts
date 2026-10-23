import { z } from 'zod/v4';
import type { Locale } from '$lib/i18n';
import { DEFAULT_LANDINGS, isSafeLink, LANDING_ICONS, SECTION_KEYS, STORED_NAME, type SectionKey } from './landing';

/*
 * The landing page's validation: what the dashboard editor checks as you type and the server
 * checks before storing. Kept apart from the content (./landing) so public pages, which only need
 * the defaults and types, never download the validator.
 */

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

/**
 * Stored settings made whole: each top-level part that fails to parse (an older shape, a hand
 * edit) falls back to its default in `locale` on its own, so one bad part never blanks the page.
 */
export function mergeLanding(stored: unknown, locale: Locale = 'en'): LandingSettings {
	const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
	const merged = structuredClone(DEFAULT_LANDINGS[locale]) as Record<string, unknown>;
	for (const [key, part] of Object.entries(landingSchema.shape)) {
		if (!(key in source)) continue;
		const parsed = (part as z.ZodType).safeParse(source[key]);
		if (parsed.success) merged[key] = parsed.data;
	}
	return merged as LandingSettings;
}
