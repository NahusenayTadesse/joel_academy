import { listInstructors } from '$lib/server/public-catalog';
import type { PageServerLoad } from './$types';

// Only the fields the cards render; the per-instructor course lists stay on the server.
export const load: PageServerLoad = async () => ({
	instructors: (await listInstructors()).map(({ name, title, photoUrl, avatarUrl, courseCount }) => ({
		name,
		title,
		photoUrl,
		avatarUrl,
		courseCount
	}))
});
