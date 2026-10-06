import { formatCurrency } from '$lib/format';
import { listCourses } from '$lib/server/public-catalog';
import type { CourseSummary } from '$lib/content/catalog.types';
import type { PageServerLoad } from './$types';

const displayPrice = (course: CourseSummary) =>
	formatCurrency(course.discountPrice ?? course.price, course.currency);

export const load: PageServerLoad = async () => {
	const [lowest, highest, free, paid] = await Promise.all([
		listCourses({ accessType: 'PAID', sort: 'price_asc', pageSize: 1 }),
		listCourses({ accessType: 'PAID', sort: 'price_desc', pageSize: 1 }),
		listCourses({ accessType: 'FREE', pageSize: 1 }),
		listCourses({ accessType: 'PAID', pageSize: 1 })
	]);
	const [low, high] = [lowest.items[0], highest.items[0]];
	// Only the formatted range is sent to the page, not the full course summaries.
	return {
		freeCount: free.total,
		paidCount: paid.total,
		priceRange: low && high ? { lowest: displayPrice(low), highest: displayPrice(high) } : null
	};
};
