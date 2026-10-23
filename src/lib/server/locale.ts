import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { baseLocale, getLocale, isLocale, type Locale } from '$lib/i18n';

/*
 * Which language to write to someone in. A page request knows its own locale, but emails and texts
 * are often sent on someone else's request (staff approving a receipt), so they follow the
 * language the recipient last used the site in, stored on their account.
 */

/** The stored language of the account with this email, or the current request's when there is none. */
export async function recipientLocale(email: string): Promise<Locale> {
	const [found] = await db.select({ locale: user.locale }).from(user).where(eq(user.email, email)).limit(1);
	if (found && isLocale(found.locale)) return found.locale;
	return currentLocale();
}

/** The current request's locale, or English outside a request. */
export function currentLocale(): Locale {
	try {
		return getLocale();
	} catch {
		return baseLocale;
	}
}

/** Last language written per account, so a page view costs a query only when it changes. */
const remembered = new Map<string, Locale>();

/** Records the language a signed-in person is browsing in. */
export async function rememberLocale(userId: string, locale: Locale): Promise<void> {
	if (remembered.get(userId) === locale) return;
	await db.update(user).set({ locale }).where(eq(user.id, userId));
	remembered.set(userId, locale);
	if (remembered.size > 5000) remembered.clear();
}
