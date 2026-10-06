import { verifyCertificate } from '$lib/server/certificates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Printed links and QR codes have used `token`, `code` and `q` over time; accept all three.
	const params = url.searchParams;
	const identifier = (params.get('token') ?? params.get('code') ?? params.get('q') ?? '').trim();
	return {
		identifier,
		result: identifier ? await verifyCertificate(identifier) : null
	};
};
