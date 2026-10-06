/**
 * A `redirectTo` value we are willing to follow, or `null`. Only a local path — `//evil.example`
 * is a protocol-relative URL, not a path, and browsers read a backslash as a slash.
 */
export function safeRedirectPath(target: string | null | undefined, origin: string): string | null {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return null;
	const resolved = new URL(target, origin);
	return resolved.origin === origin ? resolved.pathname + resolved.search : null;
}

/** Where someone lands after signing in or registering: the page they came from, else their home. */
export function afterSignIn(url: URL, isStaff: boolean): string {
	return safeRedirectPath(url.searchParams.get('redirectTo'), url.origin) ?? (isStaff ? '/dashboard' : '/my-courses');
}

/** The sign-in page, set to bring the visitor back to `url` afterwards. */
export function signInHref(url: Pick<URL, 'pathname' | 'search'>): string {
	return `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`;
}
