import { m } from '$lib/paraglide/messages';
import { getLocale, INTL_LOCALES, type Locale } from '$lib/i18n';

/*
 * Dates in the student area, in Addis Ababa time (as the dashboard shows them), so the server's
 * render and the browser's agree whatever either one's own time zone is.
 */
const TIME_ZONE = 'Africa/Addis_Ababa';

/* One set of formatters per language, made on first use (the language is per request). */
const formatters = new Map<
	Locale,
	{ date: Intl.DateTimeFormat; dateTime: Intl.DateTimeFormat; relative: Intl.RelativeTimeFormat }
>();

function formattersFor(locale: Locale = getLocale()) {
	let found = formatters.get(locale);
	if (!found) {
		const tag = INTL_LOCALES[locale];
		found = {
			date: new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeZone: TIME_ZONE }),
			dateTime: new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }),
			relative: new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })
		};
		formatters.set(locale, found);
	}
	return found;
}

export const formatDate = (iso: string) => formattersFor().date.format(new Date(iso));
export const formatDateTime = (iso: string) => formattersFor().dateTime.format(new Date(iso));

/** Each unit, and how many of it make the next. */
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	['minute', 60],
	['hour', 24],
	['day', 7],
	['week', 5]
];

/** "just now", "5 minutes ago", "yesterday"; past a month, the date itself. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
	let value = Math.round((now - Date.parse(iso)) / 1000);
	if (value < 45) return m.learn_time_just_now();
	value = value / 60;
	for (const [unit, size] of STEPS) {
		if (value < size) return formattersFor().relative.format(-Math.max(1, Math.round(value)), unit);
		value = value / size;
	}
	return formatDate(iso);
}

/** Learning time from seconds: "3h 20m", "45m", or "0m". */
export function formatLearningTime(seconds: number): string {
	const minutes = Math.round(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (hours === 0) return m.learn_time_m({ minutes: rest });
	return rest === 0 ? m.learn_time_h({ hours }) : m.learn_time_hm({ hours, minutes: rest });
}
