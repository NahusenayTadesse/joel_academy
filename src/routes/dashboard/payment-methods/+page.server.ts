import { contentCrud } from '@nahu/admin-kit/server/crud';
import { lookupDeleteAction } from '@nahu/admin-kit/server/lookupDelete';
import { paymentMethod } from '$lib/server/db/schema';
import { blankToNull } from '$lib/server/dashboard/values';
import { addSchema, editSchema } from './schema';

const crud = contentCrud({
	table: paymentMethod,
	label: 'Payment method',
	addSchema,
	editSchema,
	transform: (values) => blankToNull(values, ['instructions'])
});

export const load = crud.load;
export const actions = {
	add: crud.actions.add,
	edit: crud.actions.edit,
	// Soft delete: enrolments paid through it keep pointing at it.
	delete: lookupDeleteAction(paymentMethod, 'Payment method')
};
