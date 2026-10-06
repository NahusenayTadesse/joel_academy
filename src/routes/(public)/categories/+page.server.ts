import { listCategories } from '$lib/server/public-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ categories: await listCategories() });
