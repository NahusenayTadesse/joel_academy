import { z } from 'zod/v4';
import { PROMO_CODE_PATTERN } from '$lib/promo';
import { choices, idField, optionalReference, optionalText } from '../form-fields';

// Mirrors the enum in the db schema, which is server-only and cannot be imported by the form.
export const DISCOUNT_TYPES = ['PERCENT', 'FIXED'] as const;
export const discountTypeChoices = choices(DISCOUNT_TYPES, {
	PERCENT: 'Percentage off',
	FIXED: 'Fixed amount off'
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z
	.string()
	.trim()
	.refine((value) => value === '' || (ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))), 'Pick a date')
	.nullish();

const fields = z.object({
	code: z
		.string()
		.trim()
		.min(1, 'Required')
		.refine((value) => PROMO_CODE_PATTERN.test(value.toUpperCase()), '3-40 letters, digits, - or _ (no spaces)'),
	description: optionalText(255),
	discountType: z.enum(DISCOUNT_TYPES).default('PERCENT'),
	discountValue: z.number().positive('Above zero').max(99_999_999),
	courseId: optionalReference,
	maxRedemptions: z.number().int('A whole number').min(1, 'At least 1').nullable().default(null),
	startsAt: optionalDate,
	endsAt: optionalDate,
	status: z.boolean().default(true)
});

/** Rules both forms share; separate because zod refuses to `extend` a refined object. */
function rules(
	value: { discountType: string; discountValue: number; startsAt?: string | null; endsAt?: string | null },
	ctx: z.RefinementCtx
) {
	if (value.discountType === 'PERCENT' && (value.discountValue < 1 || value.discountValue > 100))
		ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'A percentage from 1 to 100' });
	if (value.startsAt && value.endsAt && value.endsAt < value.startsAt)
		ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Ends before it starts' });
}

export const addSchema = fields.superRefine(rules);
export const editSchema = fields.extend({ id: idField }).superRefine(rules);
