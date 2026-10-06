import { z } from 'zod/v4';
import {
	choices,
	idField,
	imageFile,
	optionalReference,
	optionalText,
	orderField,
	requiredText,
	slugField
} from '../form-fields';

// Mirrors the enums in the db schema, which is server-only and cannot be imported by the form.
export const ACCESS_TYPES = ['FREE', 'PAID'] as const;
export const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const;

export const accessChoices = choices(ACCESS_TYPES, {
	FREE: 'Free',
	PAID: 'Paid'
});
export const difficultyChoices = choices(DIFFICULTIES, {
	BEGINNER: 'Beginner',
	INTERMEDIATE: 'Intermediate',
	ADVANCED: 'Advanced',
	ALL_LEVELS: 'All levels'
});

const fields = z.object({
	name: requiredText(180, 2),
	slug: slugField,
	subtitle: optionalText(255),
	shortDescription: optionalText(500),
	description: requiredText(20_000, 10),
	categoryId: optionalReference,
	instructorId: optionalReference,
	thumbnail: imageFile.optional(),
	accessType: z.enum(ACCESS_TYPES).default('FREE'),
	price: z.number().min(0, 'Zero or more').max(99_999_999).default(0),
	discountPrice: z.number().min(0, 'Zero or more').nullable().default(null),
	currency: z
		.string()
		.trim()
		.regex(/^[A-Za-z]{3}$/, 'A three-letter code, like ETB')
		.default('ETB'),
	difficulty: z.enum(DIFFICULTIES).default('BEGINNER'),
	durationMinutes: z.number().int().min(0, 'Zero or more').nullable().default(null),
	language: requiredText(80).default('English'),
	certificateEnabled: z.boolean().default(true),
	featured: z.boolean().default(false),
	outcomes: optionalText(5000),
	requirements: optionalText(5000),
	tags: optionalText(1000),
	status: z.boolean().default(false),
	sortOrder: orderField
});

/** The pricing rules both forms share. Separate because zod refuses to `extend` a refined object. */
function pricing(
	value: { accessType: string; price: number; discountPrice: number | null },
	ctx: z.RefinementCtx
) {
	if (value.accessType !== 'PAID') return;
	if (!(value.price > 0)) {
		ctx.addIssue({
			code: 'custom',
			path: ['price'],
			message: 'A paid course needs a price above zero'
		});
	}
	if (value.discountPrice !== null && value.price > 0 && value.discountPrice >= value.price) {
		ctx.addIssue({
			code: 'custom',
			path: ['discountPrice'],
			message: 'The discounted price must be below the price'
		});
	}
}

export const addSchema = fields.superRefine(pricing);
export const editSchema = fields.extend({ id: idField }).superRefine(pricing);
