import { and, asc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
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
	},

	/**
	 * Stores a new hero picture and answers with its name; the editor puts that name in the form,
	 * and it becomes public (served by /media) only once the page is saved with it.
	 */
	uploadHero: async ({ request }) => {
		const file = (await request.formData()).get('image');
		if (!(file instanceof File) || file.size === 0) return fail(400, { message: 'Choose an image.' });
		if (!file.type.startsWith('image/')) return fail(400, { message: 'An image, not a document.' });
		try {
			return { image: await saveUploadedFile(file) };
		} catch (err) {
			if (err instanceof UploadRefused) return fail(400, { message: err.message });
			throw err;
		}
	}
};
