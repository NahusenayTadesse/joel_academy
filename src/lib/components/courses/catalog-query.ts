import {
	DEFAULT_CATALOG_FILTERS,
	DEFAULT_PAGE_SIZE,
	type CatalogFilters
} from '$lib/content/catalog.constants';
import { ROUTES } from '$lib/site';

/*
 * The catalog's filter + pagination state lives in the URL query string (same keys as the original
 * `useQueryFilters` hook), so filters survive refresh, back/forward and sharing. These helpers are
 * shared by the server load, which reads the state, and the controls, which write it.
 */

export interface CatalogQuery {
	filters: CatalogFilters;
	page: number;
	pageSize: number;
}

const FILTER_KEYS = Object.keys(DEFAULT_CATALOG_FILTERS) as (keyof CatalogFilters)[];

export function readCatalogQuery(searchParams: URLSearchParams): CatalogQuery {
	const filters: CatalogFilters = { ...DEFAULT_CATALOG_FILTERS };
	for (const key of FILTER_KEYS) {
		const raw = searchParams.get(String(key));
		if (raw !== null) filters[key] = raw;
	}
	return {
		filters,
		page: Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1),
		// Capped so a hand-edited URL cannot request the whole catalog in one page.
		pageSize: Math.min(100, Math.max(1, Math.floor(Number(searchParams.get('pageSize'))) || DEFAULT_PAGE_SIZE))
	};
}

/** Only non-default values are written, keeping the URL clean. */
export function catalogHref(
	{ filters, page, pageSize }: CatalogQuery,
	basePath: string = ROUTES.courses.list
) {
	const params = new URLSearchParams();
	for (const key of FILTER_KEYS) {
		const value = filters[key];
		if (value !== undefined && value !== '' && value !== DEFAULT_CATALOG_FILTERS[key]) {
			params.set(String(key), value);
		}
	}
	if (page > 1) params.set('page', String(page));
	if (pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(pageSize));
	const query = params.toString();
	return query ? `${basePath}?${query}` : basePath;
}
