import { getLocale, INTL_LOCALES, type Locale } from '$lib/i18n';

/* In UTC, so the server's render and the browser's agree on the day whatever their time zones. */
const formats = new Map<Locale, Intl.DateTimeFormat>();

function dateFormat(locale: Locale = getLocale()) {
	let found = formats.get(locale);
	if (!found) {
		found = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: 'medium', timeZone: 'UTC' });
		formats.set(locale, found);
	}
	return found;
}

export const formatCertificateDate = (iso: string) => dateFormat().format(new Date(iso));
export const isoDay = (iso: string) => iso.slice(0, 10);
