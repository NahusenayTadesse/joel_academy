import { readCatalogQuery } from '$lib/components/courses/catalog-query';
import { buildItemListJsonLd } from '$lib/json-ld';
import type { CourseAccessType, CourseDifficulty, CourseSort } from '$lib/content/catalog.types';
import { listCategories, listCourses } from '$lib/server/public-catalog';
import { ROUTES } from '$lib/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = readCatalogQuery(url.searchParams);
	const { filters, page, pageSize } = query;

	const courses = await listCourses({
		search: filters.search?.trim() || undefined,
		categoryId: filters.categoryId,
		accessType: filters.accessType as CourseAccessType | undefined,
		difficulty: filters.difficulty as CourseDifficulty | undefined,
		sort: (filters.sort as CourseSort) || 'newest',
		page,
		pageSize
	});

	// The ItemList structured data always describes the unfiltered catalog, as the original did.
	const itemList = (await listCourses({ pageSize: 20 })).items.map((course) => ({
		name: course.title,
		url: ROUTES.courses.detail(course.slug)
	}));

	return {
		query,
		courses,
		categories: (await listCategories()).map(({ id, name }) => ({ id, name })),
		itemListJsonLd: itemList.length > 0 ? buildItemListJsonLd(url.origin, itemList) : null
	};
};
