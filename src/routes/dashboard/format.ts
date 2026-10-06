/*
 * Times are stored in UTC; staff read them in the academy's time zone whatever the server's or
 * browser's own zone is, so a row reads the same on the server render and after hydration.
 */
const TIME_ZONE = 'Africa/Addis_Ababa';

/** A date for staff tables: "5 Oct 2026". Gregorian, unlike the kit's Ethiopian default. */
export function shortDate(value: Date | string | null | undefined): string {
	if (!value) return '';
	return new Date(value).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: TIME_ZONE
	});
}

/** "5 Oct 2026, 14:05" — for things that happen several times a day. */
export function dateTime(value: Date | string | null | undefined): string {
	if (!value) return '';
	return new Date(value).toLocaleString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: TIME_ZONE
	});
}
