import { getLandingSettings } from '$lib/server/landing';
import { unreadNotificationCount } from '$lib/server/notifications';
import { listCategories } from '$lib/server/public-catalog';
import { wishlistCourseIds } from '$lib/server/wishlist';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	// The bell and the hearts refresh these without reloading everything else's data.
	depends('app:notifications', 'app:wishlist');
	const userId = locals.user?.id;
	const [categories, landing, unreadNotifications, wishlistIds] = await Promise.all([
		listCategories(),
		getLandingSettings(),
		userId ? unreadNotificationCount(userId) : 0,
		userId ? wishlistCourseIds(userId) : null
	]);
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
		unreadNotifications,
		/** Null when signed out: the browser's own list applies then. */
		wishlistIds,
		menuCategories: categories.slice(0, 8).map(({ id, name, slug }) => ({ id, name, slug })),
		announcement: landing.announcement
	};
};
