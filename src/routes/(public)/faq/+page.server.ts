import { getLandingSettings } from '$lib/server/landing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	faqs: (await getLandingSettings()).faqs
});
