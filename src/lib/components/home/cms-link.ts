import { localizePath } from '$lib/i18n';

/** Site areas that live outside the language prefix: the dashboard, endpoints and files. */
const UNLOCALIZED = /^\/(dashboard|api|media|lesson-files|newsletter)(?=$|[/?#])/;

/**
 * An editor-set link from the landing CMS, ready to render: a path on this site is moved into the
 * page's language ("/courses" → "/am/courses" on the Amharic site); https links stay as they are.
 */
export function cmsHref(url: string): string {
	return url.startsWith('/') && !url.startsWith('//') && !UNLOCALIZED.test(url)
		? localizePath(url)
		: url;
}
