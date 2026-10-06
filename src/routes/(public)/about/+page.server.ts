import { platformStats } from '$lib/server/public-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { totalCourses, totalCategories, instructorCount } = await platformStats();
	return { stats: { totalCourses, totalCategories, instructorCount } };
};
