import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

/**
 * Only public and student pages exist in Amharic. The dashboard, APIs, files and feeds have no
 * "/am" twin: routing "/am/dashboard" to the dashboard would skip the access rules, which match
 * on the address as typed.
 */
const UNLOCALIZED = /^\/(dashboard|api|media|lesson-files|health|newsletter|sitemap\.xml|robots\.txt)(\/|$)/;

export const reroute: Reroute = ({ url }) => {
	const path = deLocalizeUrl(url).pathname;
	if (path !== url.pathname && UNLOCALIZED.test(path)) return url.pathname;
	return path;
};
