import type { Locale } from '$lib/i18n';
import type { LandingAnnouncement, LandingSettings } from './landing-schema';
import { FAQ_ITEMS, FAQ_ITEMS_AM } from './faq.data';

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
export const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/i;

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

export type {
	LandingSettings,
	LandingHero,
	LandingIconItem,
	LandingStep,
	LandingFinalCta,
	LandingAnnouncement,
	LandingFaq
} from './landing-schema';

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

/**
 * The Amharic site's defaults: DEFAULT_LANDING's text in Amharic, with the same links, icons,
 * picture, announcement name and section switches. Stored separately (see `$lib/server/landing`),
 * so each language is edited on its own.
 */
export const DEFAULT_LANDING_AM: LandingSettings = {
	sections: Object.fromEntries(SECTION_KEYS.map((key) => [key, true])) as Record<
		SectionKey,
		boolean
	>,
	hero: {
		badge: 'በዓላማ ይማሩ',
		heading: 'የሙያ ሕይወትዎን ቀጣይ ምዕራፍ ይገንቡ።',
		description:
			'ከምንጩ በቀጥታ ይማሩ። በዘርፉ ግንባር ቀደም ባለሙያዎች በጥንቃቄ የተዘጋጀው፣ የተደራጀ እና በራስዎ ፍጥነት የሚማሩበት ሥርዓተ ትምህርታችን አላስፈላጊ ነገር ሳይጨመርበት የላቀ ውጤት እንዲያስገኝ ተደርጎ የተቀረጸ ነው። የሚገዙት ኮርስ ብቻ አይደለም፤ በከፍተኛ ደረጃ ስልጠና ላይ መዋዕለ ንዋይ እያፈሰሱ ነው።',
		primaryCtaText: 'ሥርዓተ ትምህርቱን ይመልከቱ',
		primaryCtaUrl: '/courses',
		secondaryCtaText: 'ነጻ መለያ ይፍጠሩ',
		secondaryCtaUrl: '/register',
		image: DEFAULT_HERO_IMAGE,
		imageAlt: 'የዲጂታል ኔትወርክ ረቂቅ ምስል',
		imageCaption:
			'እውነተኛ ኮርሶች። እውነተኛ አሰልጣኞች። ሥራ እንዲያገኙ፣ እድገት እንዲያገኙ ወይም የተሻለ ገቢ እንዲያገኙ የተገነባ የመማሪያ ሥርዓት።'
	},
	valuePills: [
		{
			icon: 'Clock',
			title: 'በራስ ፍጥነት መማር',
			description: 'በሚመችዎ ሰዓት ይማሩ፤ የተመዘገቡበትን እያንዳንዱን ኮርስ ዕድሜ ልክ ያገኙታል።'
		},
		{
			icon: 'Users',
			title: 'እውነተኛ አሰልጣኞች',
			description: 'ስላይድ በሚያነቡ ተራኪዎች ሳይሆን በሥራ ላይ ባሉ ባለሙያዎች የሚሰጡ ኮርሶች።'
		},
		{
			icon: 'Award',
			title: 'የተረጋገጡ ሰርተፊኬቶች',
			description: 'ሰርተፊኬት የሚያስገኝ ኮርስ ያጠናቅቁ፤ የተማሩትንም ለቀጣሪዎች ያሳዩ።'
		}
	],
	whyChooseUs: [
		{
			icon: 'Clock',
			title: 'በራስዎ ፍጥነት ይማሩ',
			description: 'ኮርሶቹ በራስዎ ፍጥነት የሚማሩባቸው እና ዕድሜ ልክ የሚያገኟቸው ናቸው፤ በሚመችዎ ጊዜ ይማሩ።'
		},
		{
			icon: 'Award',
			title: 'ሰርተፊኬት ያግኙ',
			description: 'ብቁ የሆኑ ኮርሶችን አጠናቅቀው ለሌሎች ማጋራት የሚችሉትን የማጠናቀቂያ ሰርተፊኬት ያግኙ።'
		},
		{
			icon: 'ShieldCheck',
			title: 'የተመረጡ አሰልጣኞች',
			description: 'ጥራቱን ለመጠበቅ እያንዳንዱ ኮርስ ይፋ ከመሆኑ በፊት ይገመገማል።'
		},
		{
			icon: 'Smartphone',
			title: 'በየትኛውም ቦታ ይማሩ',
			description: 'በኮምፒውተር፣ በታብሌት እና በሞባይል ላይ ምቹ ሆኖ የሚሠራ።'
		}
	],
	howItWorks: [
		{ title: 'መለያ ይፍጠሩ', description: 'ከአንድ ደቂቃ ባነሰ ጊዜ በነጻ ይመዝገቡ።' },
		{ title: 'ኮርስ ይምረጡ', description: 'የኮርሶችን ዝርዝር ያስሱ ወይም ርዕስ ይፈልጉ።' },
		{ title: 'መማር ይጀምሩ', description: 'ትምህርቶቹን በራስዎ ፍጥነት ይከታተሉ።' },
		{ title: 'ሰርተፊኬት ያግኙ', description: 'ኮርሱን ያጠናቅቁ፤ ሰርተፊኬትዎን ይውሰዱ።' }
	],
	mentor: { instructorSlug: '' },
	finalCta: {
		heading: 'ለመጀመር ዝግጁ ነዎት?',
		description: 'ዛሬውኑ በነጻ ይቀላቀሉ እና ሁሉንም ኮርሶቻችንን ያግኙ፤ ምንም ክሬዲት ካርድ አያስፈልግም።',
		ctaText: 'ነጻ መለያዎን ይፍጠሩ',
		ctaUrl: '/register'
	},
	announcement: {
		enabled: true,
		id: 'summer-2026-launch',
		text: 'በዚህ ወር አዲስ፦ በክላውድ፣ በሳይበር ደህንነት እና በAI ዘርፎች በደርዘን የሚቆጠሩ ኮርሶች።',
		linkText: 'ኮርሶቹን ያስሱ',
		linkUrl: '/courses'
	},
	faqs: FAQ_ITEMS_AM.map(({ question, answer }) => ({ question, answer }))
};

/** The shipped content for each language. */
export const DEFAULT_LANDINGS: Record<Locale, LandingSettings> = {
	en: DEFAULT_LANDING,
	am: DEFAULT_LANDING_AM
};

/** A deep copy of one section's defaults in `locale`, safe to hand to a form. */
export function defaultSection<K extends keyof LandingSettings>(
	key: K,
	locale: Locale = 'en'
): LandingSettings[K] {
	return structuredClone(DEFAULT_LANDINGS[locale][key]);
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
