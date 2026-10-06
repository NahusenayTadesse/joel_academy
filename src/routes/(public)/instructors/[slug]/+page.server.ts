import { error } from '@sveltejs/kit';
import { getInstructor } from '$lib/server/public-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const instructor = await getInstructor(params.slug);
	if (!instructor) error(404, 'Instructor not found');
	return { instructor };
};
