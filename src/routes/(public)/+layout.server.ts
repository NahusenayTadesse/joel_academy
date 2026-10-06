import { getLandingSettings } from '$lib/server/landing';
import { listCategories } from '$lib/server/public-catalog';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const [categories, landing] = await Promise.all([listCategories(), getLandingSettings()]);
	return {
		user: locals.user
			? {
					name: locals.user.name,
					email: locals.user.email,
					image: locals.user.image,
					// Staff land in the dashboard; students in their own learning area.
					isStaff: locals.isSuperAdmin || locals.permList.includes('dashboard.view')
				}
			: null,
		menuCategories: categories.slice(0, 8).map(({ id, name, slug }) => ({ id, name, slug })),
		announcement: landing.announcement
	};
};
