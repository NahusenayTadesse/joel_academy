import { error } from '@sveltejs/kit';
import { DEFAULT_PAGE_SIZE } from '$lib/content/catalog.constants';
import { getCategory } from '$lib/server/public-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const result = await getCategory(params.slug, page, DEFAULT_PAGE_SIZE);
	if (!result) error(404, 'Category not found');
	return {
		...result,
		page,
		totalPages: Math.max(1, Math.ceil(result.courses.total / DEFAULT_PAGE_SIZE))
	};
};
