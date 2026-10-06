import { goto } from '$app/navigation';
import { page } from '$app/state';
import { catalogHref, type CatalogQuery } from './catalog-query';

/**
 * Writes the catalog state to the URL the way the original `router.replace(..., { scroll: false })`
 * did: no new history entry, no scroll jump, and the search box keeps focus while results reload.
 */
export function navigateCatalog(next: CatalogQuery) {
	const href = catalogHref(next, page.url.pathname);
	if (href === page.url.pathname + page.url.search) return;
	return goto(href, { replaceState: true, noScroll: true, keepFocus: true });
}
