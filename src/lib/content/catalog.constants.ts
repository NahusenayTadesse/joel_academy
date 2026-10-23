import { m } from '$lib/paraglide/messages';
import type { CourseDifficulty, CourseSort } from './catalog.types';

// Getters, so each read is in the current request's language (never translated at import time).
export const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
	get BEGINNER() {
		return m.catalog_difficulty_beginner();
	},
	get INTERMEDIATE() {
		return m.catalog_difficulty_intermediate();
	},
	get ADVANCED() {
		return m.catalog_difficulty_advanced();
	},
	get ALL_LEVELS() {
		return m.catalog_difficulty_all_levels();
	}
};

export const SORT_LABELS: Record<CourseSort, string> = {
	get newest() {
		return m.catalog_sort_newest();
	},
	get oldest() {
		return m.catalog_sort_oldest();
	},
	get title_asc() {
		return m.catalog_sort_title_asc();
	},
	get title_desc() {
		return m.catalog_sort_title_desc();
	},
	get price_asc() {
		return m.catalog_sort_price_asc();
	},
	get price_desc() {
		return m.catalog_sort_price_desc();
	},
	get featured() {
		return m.catalog_sort_featured();
	}
};

export const DEFAULT_PAGE_SIZE = 12;

/**
 * URL-synced filter shape shared by `CourseFilters`/`CoursesGrid` - both
 * consume the same query-string keys via `useQueryFilters`, so the two
 * components stay in sync through the URL itself (no shared client state
 * needed) and filters survive refresh/back-forward/sharing on whichever
 * route they're mounted on (public `/courses` or `/dashboard/browse-courses`).
 */
export interface CatalogFilters {
	[key: string]: string | undefined;
	search: string | undefined;
	categoryId: string | undefined;
	accessType: string | undefined;
	difficulty: string | undefined;
	sort: string;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
	search: undefined,
	categoryId: undefined,
	accessType: undefined,
	difficulty: undefined,
	sort: 'newest'
};
