import { verifyCertificate } from '$lib/server/certificates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({ result: await verifyCertificate(params.token) });
