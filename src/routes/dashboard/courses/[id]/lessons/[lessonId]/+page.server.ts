import { error, redirect } from '@sveltejs/kit';
import { and, asc, count, eq, isNotNull, sql } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setFlash } from 'sveltekit-flash-message/server';
import { db } from '$lib/server/db';
import { courseSection, lesson, lessonProgress, lessonResource } from '$lib/server/db/schema';
import { courseFromParam, lessonOf, nextOrder, sectionOf } from '$lib/server/dashboard/curriculum';
import { flashFail, flashOk, postedId } from '$lib/server/dashboard/values';
import { postedForm, MAX_UPLOAD_BYTES, UploadRefused } from '@nahu/admin-kit/server/files';
import { removeLessonFile, storeLessonFile, type StoredLessonFile } from '$lib/server/lesson-files';
import { formatDuration } from '../../../../form-fields';
import { lessonColumns } from '../../lessons.server';
import {
	lessonEditSchema,
	moveSchema,
	passingScoreSchema,
	questionEditSchema,
	questionInput,
	questionSchema,
	resourceEditSchema,
	resourceSchema
} from '../../schema';
import {
	deleteQuestion,
	editorQuestions,
	moveQuestion,
	saveQuestion,
	setPassingScore
} from '$lib/server/quiz';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** The columns of a resource that is a link, not a file. */
const NO_FILE = { file: null, fileName: null, fileSize: null, mimeType: null };

/** The file posted with a resource form, if one was chosen. */
function uploadOf(posted: FormData): File | null {
	const upload = posted.get('file');
	return upload instanceof File && upload.size > 0 ? upload : null;
}

async function scope({ params }: Pick<RequestEvent, 'params'>) {
	const course = await courseFromParam(params.id);
	const found = await lessonOf(course.id, Number(params.lessonId));
	if (!found) error(404, 'Lesson not found');
	return { course, lesson: found };
}

export const load: PageServerLoad = async (event) => {
	const { course, lesson: row } = await scope(event);

	const [
		sections,
		resources,
		[completions],
		form,
		resourceAddForm,
		resourceEditForm,
		questions,
		questionAddForm,
		questionEditForm,
		passingForm
	] = await Promise.all([
			db
				.select({ value: courseSection.id, name: courseSection.title })
				.from(courseSection)
				.where(eq(courseSection.courseId, course.id))
				.orderBy(asc(courseSection.sortOrder), asc(courseSection.id)),
			// Everything but the stored name: staff download through the same route as students.
			db
				.select({
					id: lessonResource.id,
					title: lessonResource.title,
					url: lessonResource.url,
					hasFile: sql<number>`${lessonResource.file} is not null`,
					fileName: lessonResource.fileName,
					fileSize: lessonResource.fileSize,
					sortOrder: lessonResource.sortOrder
				})
				.from(lessonResource)
				.where(eq(lessonResource.lessonId, row.id))
				.orderBy(asc(lessonResource.sortOrder), asc(lessonResource.id)),
			db.select({ total: count() }).from(lessonProgress).where(eq(lessonProgress.lessonId, row.id)),
			superValidate(
				{
					id: row.id,
					sectionId: row.sectionId,
					title: row.title,
					lessonType: row.lessonType,
					duration: formatDuration(row.durationSeconds),
					isPreview: row.isPreview,
					isMandatory: row.isMandatory,
					videoUrl: row.videoUrl ?? '',
					externalUrl: row.externalUrl ?? '',
					content: row.content ?? ''
				},
				zod4(lessonEditSchema),
				{ errors: false }
			),
			superValidate(zod4(resourceSchema)),
			superValidate(zod4(resourceEditSchema)),
			editorQuestions(row.id),
			superValidate(zod4(questionSchema)),
			superValidate(zod4(questionEditSchema)),
			superValidate({ passingScore: row.passingScore }, zod4(passingScoreSchema), { errors: false })
		]);

	return {
		course,
		lesson: { id: row.id, title: row.title, sectionId: row.sectionId, lessonType: row.lessonType },
		sections,
		resources: resources.map(({ hasFile, ...resource }) => ({ ...resource, hasFile: Boolean(Number(hasFile)) })),
		maxUploadBytes: MAX_UPLOAD_BYTES,
		completions: completions.total,
		form,
		resourceAddForm,
		resourceEditForm,
		quiz: { questions, questionAddForm, questionEditForm, passingForm }
	};
};

export const actions: Actions = {
	save: async (event) => {
		const { course, lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(lessonEditSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		if (!(await sectionOf(course.id, form.data.sectionId))) {
			return message(
				form,
				{ type: 'error', text: 'Pick a section of this course.' },
				{ status: 400 }
			);
		}

		const values = lessonColumns(form.data) as Partial<typeof lesson.$inferInsert>;
		// Moved to another section: it goes to the end there rather than colliding with its order.
		if (form.data.sectionId !== row.sectionId) {
			const siblings = await db
				.select({ sortOrder: lesson.sortOrder })
				.from(lesson)
				.where(eq(lesson.sectionId, form.data.sectionId));
			values.sortOrder = nextOrder(siblings);
		}
		await db.update(lesson).set(values).where(eq(lesson.id, row.id));
		// Echo back what was stored, so the editor shows the body as students will see it.
		form.data.content = values.content ?? '';
		return message(form, { type: 'success', text: 'Lesson saved.' });
	},

	delete: async (event) => {
		const { course, lesson: row } = await scope(event);
		// Its resources go with it (cascade); their files are deleted here, once the rows are gone.
		const files = await db
			.select({ file: lessonResource.file })
			.from(lessonResource)
			.where(and(eq(lessonResource.lessonId, row.id), isNotNull(lessonResource.file)));
		await db.delete(lesson).where(eq(lesson.id, row.id));
		await Promise.all(files.map(({ file }) => removeLessonFile(file)));
		setFlash({ type: 'success', message: `Deleted “${row.title}”.` }, event.cookies);
		redirect(303, `/dashboard/courses/${course.id}`);
	},

	addResource: async (event) => {
		const { lesson: row } = await scope(event);
		const posted = await postedForm(event.request);
		const form = await superValidate(posted, zod4(resourceSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		const { kind, title, url, sortOrder } = form.data;

		let attached: StoredLessonFile | null = null;
		if (kind === 'FILE') {
			const upload = uploadOf(posted);
			if (!upload) return message(form, { type: 'error', text: 'Choose a file to upload.' }, { status: 400 });
			try {
				attached = await storeLessonFile(upload);
			} catch (err) {
				if (err instanceof UploadRefused) return message(form, { type: 'error', text: err.message }, { status: 400 });
				throw err;
			}
		}
		await db.insert(lessonResource).values({
			lessonId: row.id,
			title,
			sortOrder,
			...(attached ? { ...attached, url: null } : { url: url ?? null, ...NO_FILE })
		});
		return message(form, { type: 'success', text: attached ? 'File added.' : 'Resource added.' });
	},

	editResource: async (event) => {
		const { lesson: row } = await scope(event);
		const posted = await postedForm(event.request);
		const form = await superValidate(posted, zod4(resourceEditSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the form.' }, { status: 400 });
		const { id, kind, title, url, sortOrder } = form.data;
		// Scoped to this lesson, so a resource id from another lesson matches nothing.
		const [existing] = await db
			.select({ file: lessonResource.file })
			.from(lessonResource)
			.where(and(eq(lessonResource.id, id), eq(lessonResource.lessonId, row.id)))
			.limit(1);
		if (!existing) return message(form, { type: 'error', text: 'That resource is gone.' }, { status: 404 });

		let values: Partial<typeof lessonResource.$inferInsert> = { title, sortOrder };
		if (kind === 'FILE') {
			const upload = uploadOf(posted);
			if (upload) {
				try {
					values = { ...values, ...(await storeLessonFile(upload)), url: null };
				} catch (err) {
					if (err instanceof UploadRefused) return message(form, { type: 'error', text: err.message }, { status: 400 });
					throw err;
				}
			} else if (!existing.file) {
				return message(form, { type: 'error', text: 'Choose a file to upload.' }, { status: 400 });
			} else {
				values.url = null;
			}
		} else {
			values = { ...values, url: url ?? null, ...NO_FILE };
		}
		await db.update(lessonResource).set(values).where(eq(lessonResource.id, id));
		// The old file goes once nothing points at it: replaced, or the resource is a link now.
		if (existing.file && values.file !== undefined && values.file !== existing.file) await removeLessonFile(existing.file);
		return message(form, { type: 'success', text: 'Resource saved.' });
	},

	deleteResource: async (event) => {
		const { lesson: row } = await scope(event);
		const id = postedId(await event.request.formData());
		const where = and(eq(lessonResource.id, id), eq(lessonResource.lessonId, row.id));
		const [existing] = await db.select({ file: lessonResource.file }).from(lessonResource).where(where).limit(1);
		const [result] = await db.delete(lessonResource).where(where);
		if (!result.affectedRows) return flashFail(event.cookies, 'That resource is gone.', 404);
		await removeLessonFile(existing?.file);
		return flashOk(event.cookies, 'Resource deleted.');
	},

	/* ---- the quiz builder: questions are this lesson's, whatever its type, until it is deleted */

	addQuestion: async (event) => {
		const { lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(questionSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the question.' }, { status: 400 });
		await saveQuestion(row.id, questionInput(form.data));
		return message(form, { type: 'success', text: 'Question added.' });
	},

	editQuestion: async (event) => {
		const { lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(questionEditSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the question.' }, { status: 400 });
		const saved = await saveQuestion(row.id, questionInput(form.data), form.data.id);
		return saved
			? message(form, { type: 'success', text: 'Question saved.' })
			: message(form, { type: 'error', text: 'That question is gone.' }, { status: 404 });
	},

	deleteQuestion: async (event) => {
		const { lesson: row } = await scope(event);
		const id = postedId(await event.request.formData());
		const outcome = await deleteQuestion(row.id, id);
		if (outcome === 'LAST')
			return flashFail(event.cookies, 'A quiz needs at least one question: add another before deleting this one.');
		return outcome === 'DELETED'
			? flashOk(event.cookies, 'Question deleted.')
			: flashFail(event.cookies, 'That question is gone.', 404);
	},

	moveQuestion: async (event) => {
		const { lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(moveSchema));
		if (!form.valid) return flashFail(event.cookies, 'Nothing to move.');
		const moved = await moveQuestion(row.id, form.data.id, form.data.direction);
		return moved ? { ok: true } : flashFail(event.cookies, 'That question is gone.', 404);
	},

	savePassingScore: async (event) => {
		const { lesson: row } = await scope(event);
		const form = await superValidate(event.request, zod4(passingScoreSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Check the pass mark.' }, { status: 400 });
		await setPassingScore(row.id, form.data.passingScore);
		return message(form, { type: 'success', text: 'Pass mark saved.' });
	}
};
