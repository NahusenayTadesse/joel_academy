import { contentCrud } from '@nahu/admin-kit/server/crud';
import { lookupDeleteAction } from '@nahu/admin-kit/server/lookupDelete';
import { testimonial } from '$lib/server/db/schema';
import { nullToBlank } from '$lib/server/dashboard/values';
import { addSchema, editSchema } from './schema';

const crud = contentCrud({
	table: testimonial,
	label: 'Testimonial',
	addSchema,
	editSchema,
	uniqueField: 'studentName',
	// Both columns are NOT NULL with a '' default.
	transform: (values) => nullToBlank(values, ['role', 'courseTitle'])
});

export const load = crud.load;
export const actions = {
	add: crud.actions.add,
	edit: crud.actions.edit,
	delete: lookupDeleteAction(testimonial, 'Testimonial')
};
