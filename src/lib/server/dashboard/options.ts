import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { category, course, instructor, paymentMethod } from '$lib/server/db/schema';

/*
 * `{ value, name }` lists for the dashboard's pickers. Soft-deleted rows are never offered; inactive
 * ones are, since staff may be preparing a category or instructor before switching it on.
 */

export const categoryOptions = () =>
	db
		.select({ value: category.id, name: category.name })
		.from(category)
		.where(isNull(category.deletedAt))
		.orderBy(asc(category.name));

export const instructorOptions = () =>
	db
		.select({ value: instructor.id, name: instructor.name })
		.from(instructor)
		.where(isNull(instructor.deletedAt))
		.orderBy(asc(instructor.name));

export const courseOptions = () =>
	db.select({ value: course.id, name: course.name }).from(course).orderBy(asc(course.name));

export const paymentMethodOptions = () =>
	db
		.select({ value: paymentMethod.id, name: paymentMethod.name })
		.from(paymentMethod)
		.where(and(isNull(paymentMethod.deletedAt), eq(paymentMethod.status, true)))
		.orderBy(asc(paymentMethod.sortOrder));
