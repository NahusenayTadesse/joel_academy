import { and, asc, eq, isNull } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { instructor } from '$lib/server/db/schema';
import { getLandingSettings, landingSchema, saveLandingSettings } from '$lib/server/landing';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [settings, instructors] = await Promise.all([
		getLandingSettings(),
		db
			.select({ slug: instructor.slug, name: instructor.name })
			.from(instructor)
			.where(and(eq(instructor.status, true), isNull(instructor.deletedAt)))
			.orderBy(asc(instructor.sortOrder), asc(instructor.name))
	]);
	return { form: await superValidate(settings, zod4(landingSchema)), instructors };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await superValidate(request, zod4(landingSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Check the highlighted fields.' }, { status: 400 });
		}
		await saveLandingSettings(form.data);
		return message(form, { type: 'success', text: 'Landing page saved. It is live now.' });
	}
};
