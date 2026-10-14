/*
 * Dates in the student area, in Addis Ababa time (as the dashboard shows them), so the server's
 * render and the browser's agree whatever either one's own time zone is.
 */
const TIME_ZONE = 'Africa/Addis_Ababa';

const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: TIME_ZONE });
const DATE_TIME = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE });
const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatDate = (iso: string) => DATE.format(new Date(iso));
export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));

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
	if (value < 45) return 'just now';
	value = value / 60;
	for (const [unit, size] of STEPS) {
		if (value < size) return RELATIVE.format(-Math.max(1, Math.round(value)), unit);
		value = value / size;
	}
	return formatDate(iso);
}

/** Learning time from seconds: "3h 20m", "45m", or "0m". */
export function formatLearningTime(seconds: number): string {
	const minutes = Math.round(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (hours === 0) return `${rest}m`;
	return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
