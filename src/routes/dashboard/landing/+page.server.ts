import { and, asc, eq, isNull } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { instructor } from '$lib/server/db/schema';
import { getLandingSettings, landingSchema, saveLandingSettings } from '$lib/server/landing';
import type { Locale } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

/** The language being edited: `?lang=am` for the Amharic site, English otherwise. */
function editedLocale(url: URL): Locale {
	return url.searchParams.get('lang') === 'am' ? 'am' : 'en';
}

export const load: PageServerLoad = async ({ url }) => {
	const lang = editedLocale(url);
	const [settings, instructors] = await Promise.all([
		getLandingSettings(lang),
		db
			.select({ slug: instructor.slug, name: instructor.name })
			.from(instructor)
			.where(and(eq(instructor.status, true), isNull(instructor.deletedAt)))
			.orderBy(asc(instructor.sortOrder), asc(instructor.name))
	]);
	return { form: await superValidate(settings, zod4(landingSchema)), instructors, lang };
};

export const actions: Actions = {
	// The form posts to `?/save&lang=…`, so a save always lands in the language it was loaded in.
	save: async ({ request, url }) => {
		const lang = editedLocale(url);
		const form = await superValidate(request, zod4(landingSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Check the highlighted fields.' }, { status: 400 });
		}
		await saveLandingSettings(form.data, lang);
		const name = lang === 'am' ? 'Amharic' : 'English';
		return message(form, { type: 'success', text: `${name} landing page saved. It is live now.` });
	}
};
