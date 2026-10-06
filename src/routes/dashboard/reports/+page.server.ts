import { getReport, resolveRange } from '$lib/server/reports';
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
		report: await getReport(range)
	};
};
