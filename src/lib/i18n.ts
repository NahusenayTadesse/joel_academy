import {
	baseLocale,
	deLocalizeHref,
	getLocale,
	isLocale,
	localizeHref,
	locales,
	type Locale
} from '$lib/paraglide/runtime';

/*
 * The site's two languages. English lives at "/", Amharic under "/am" (see project.inlang and the
 * Paraglide plugin in vite.config.ts). Text comes from `messages/{locale}.json` through
 * `import { m } from '$lib/paraglide/messages'`; this module only deals with addresses and labels.
 */

export { baseLocale, getLocale, isLocale, locales, type Locale };

/** Each language named in itself, for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', am: 'አማርኛ' };

/** Open Graph locale codes. */
export const OG_LOCALES: Record<Locale, string> = { en: 'en_US', am: 'am_ET' };

/** BCP 47 tags for `Intl` formatting, so dates and numbers read naturally in each language. */
export const INTL_LOCALES: Record<Locale, string> = { en: 'en-US', am: 'am-ET' };

/**
 * A site path in `locale` (the page's own by default): "/courses" → "/am/courses". Paths already
 * carrying a locale are re-targeted, never double-prefixed, and the Amharic home is "/am", not
 * "/am/", to match SvelteKit's no-trailing-slash URLs.
 */
export function localizePath(path: string, locale: Locale = getLocale()): string {
	const localized = localizeHref(path, { locale });
	return localized.replace(/^\/([a-z]{2})\/(?=$|[?#])/, '/$1');
}

/** The same path without its locale prefix: "/am/courses" → "/courses". */
export function delocalizePath(path: string): string {
	return deLocalizeHref(path);
}
