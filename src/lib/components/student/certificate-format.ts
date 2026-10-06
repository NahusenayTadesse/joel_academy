/* In UTC, so the server's render and the browser's agree on the day whatever their time zones. */
const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export const formatCertificateDate = (iso: string) => DATE.format(new Date(iso));
export const isoDay = (iso: string) => iso.slice(0, 10);
