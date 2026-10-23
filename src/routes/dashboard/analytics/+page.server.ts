import { getAnalytics } from '$lib/server/analytics';
import { resolveRange } from '$lib/server/report-range';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const range = resolveRange(url.searchParams);
	return {
		range: {
			preset: range.preset,
			fromDay: range.fromDay,
			toDay: range.toDay,
			days: range.days,
			bucket: range.bucket
		},
		analytics: await getAnalytics(range)
	};
};
