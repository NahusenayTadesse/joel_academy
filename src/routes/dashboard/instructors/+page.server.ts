import { count, isNotNull } from 'drizzle-orm';
import { contentCrud } from '@nahu/admin-kit/server/crud';
import { lookupDeleteAction } from '@nahu/admin-kit/server/lookupDelete';
import { db } from '$lib/server/db';
import { course, instructor } from '$lib/server/db/schema';
import { blankToNull } from '$lib/server/dashboard/values';
import { mediaUrl } from '$lib/media';
import { slugify } from '../form-fields';
import { addSchema, editSchema } from './schema';
import type { PageServerLoad } from './$types';

const crud = contentCrud({
	table: instructor,
	label: 'Instructor',
	addSchema,
	editSchema,
	uniqueField: 'slug',
	fileFields: ['photo'],
	transform: (values) => {
		if (!values.slug) values.slug = slugify(String(values.name));
		// Skills and achievements stay one-per-line text; the public pages split them.
		return blankToNull(values, ['bio', 'skills', 'achievements']);
	}
});

export const load: PageServerLoad = async () => {
	const [data, counts] = await Promise.all([
		crud.load(),
		db
			.select({ instructorId: course.instructorId, total: count() })
			.from(course)
			.where(isNotNull(course.instructorId))
			.groupBy(course.instructorId)
	]);
	const courses = new Map(counts.map((row) => [row.instructorId, row.total]));
	return {
		...data,
		rows: data.rows.map((row) => ({
			...row,
			photoUrl: mediaUrl(row.photo),
			courses: courses.get(row.id) ?? 0
		}))
	};
};

export const actions = {
	add: crud.actions.add,
	edit: crud.actions.edit,
	// Soft delete: their courses keep the link, and the public profile disappears.
	delete: lookupDeleteAction(instructor, 'Instructor')
};
