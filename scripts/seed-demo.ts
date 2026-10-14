/**
 * Loads the original LMS's demo catalog — categories, instructors, courses with their curricula,
 * and testimonials — so a fresh install has something to show.
 *
 *     npm run db:seed
 *
 * It refuses to run when the catalog already has categories or courses, so it can never mix demo
 * rows into real content. Everything it adds is ordinary data: edit or unpublish it from the
 * dashboard like anything else. Payment methods are left out on purpose — they are real bank
 * accounts, and only staff can say which ones.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { MOCK_CATEGORIES } from '../src/lib/content/categories.data';
import { MOCK_COURSE_RECORDS } from '../src/lib/content/courses.data';
import { COURSE_SEEDS } from '../src/lib/content/course-seeds.data';
import { MOCK_INSTRUCTORS } from '../src/lib/content/instructors.data';
import { MOCK_TESTIMONIALS } from '../src/lib/content/testimonials.data';
import {
	category,
	course,
	courseSection,
	instructor,
	lesson,
	lessonResource,
	quizOption,
	quizQuestion,
	testimonial
} from '../src/lib/server/db/schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

/** The lead instructor's profile as the original site showed it, over the roster's shorter one. */
const LEAD = {
	slug: 'joel-talargie',
	title: 'Founder & Lead Technical Instructor',
	bio: 'Software Engineer specializing in modern full-stack web development. Experienced in building scalable applications using React, Next.js, TypeScript, Node.js, NestJS, PostgreSQL, and MongoDB. Passionate about mentoring developers and teaching practical software development through real-world projects.',
	achievements: [
		'Over 10+ years of high-scale software engineering leadership',
		'Curriculum designed specifically for career placement & promotion',
		'Trained and certified thousands of engineers across the continent'
	]
};

/** A short example quiz, added at the end of the first free course so quizzes have a demo. */
const DEMO_QUIZ = {
	title: 'Check your understanding',
	questions: [
		{
			prompt: 'What does a large language model do, at its core?',
			explanation: 'It predicts likely next tokens; everything else is built on that.',
			options: [
				{ text: 'Predicts the next piece of text', isCorrect: true },
				{ text: 'Looks answers up in a database', isCorrect: false },
				{ text: 'Runs the code you type', isCorrect: false }
			]
		},
		{
			prompt: 'Which of these make a prompt better? Select all that apply.',
			explanation: 'Context and a clear format both narrow what a good answer looks like.',
			options: [
				{ text: 'Giving relevant context', isCorrect: true },
				{ text: 'Saying what format you want back', isCorrect: true },
				{ text: 'Keeping the task vague', isCorrect: false }
			]
		},
		{
			prompt: 'An AI answer cites a fact you have not seen before. What should you do?',
			explanation: 'Models can state wrong things confidently, so check what matters.',
			options: [
				{ text: 'Verify it against a reliable source', isCorrect: true },
				{ text: 'Trust it, since it sounds confident', isCorrect: false }
			]
		}
	]
};

const lines = (values: string[] | undefined) => (values?.length ? values.join('\n') : null);

const client = mysql.createPool({ uri: process.env.DATABASE_URL, timezone: 'Z' });
// UTC on both sides, as in src/lib/server/db/index.ts: Drizzle writes and reads timestamps as UTC.
client.pool.on('connection', (connection) => {
	connection.query("SET time_zone = '+00:00'");
});
const db = drizzle(client);

try {
	const [[categories], [courses]] = await Promise.all([
		db.select({ n: count() }).from(category),
		db.select({ n: count() }).from(course)
	]);
	if (categories.n > 0 || courses.n > 0) {
		console.error('The catalog already has content; the demo seed only runs on an empty one.');
		process.exitCode = 1;
	} else {
		await db.transaction(async (tx) => {
			const categoryIds = new Map<string, number>();
			for (const [index, entry] of MOCK_CATEGORIES.entries()) {
				const [row] = await tx
					.insert(category)
					.values({ name: entry.name, slug: entry.slug, description: entry.description, sortOrder: index })
					.$returningId();
				categoryIds.set(entry.id, row.id);
			}

			// Only instructors who present a course; the roster also lists people with none.
			const presenters = new Set(MOCK_COURSE_RECORDS.map((record) => record.presenterName));
			const instructorIds = new Map<string, number>();
			for (const [index, profile] of MOCK_INSTRUCTORS.filter((entry) => presenters.has(entry.name)).entries()) {
				const lead = profile.slug === LEAD.slug;
				const [row] = await tx
					.insert(instructor)
					.values({
						name: profile.name,
						slug: profile.slug,
						title: lead ? LEAD.title : profile.title,
						bio: lead ? LEAD.bio : profile.bio,
						photo: profile.photoUrl ?? null,
						skills: lines(profile.skills),
						achievements: lines(lead ? LEAD.achievements : profile.achievements),
						sortOrder: index
					})
					.$returningId();
				instructorIds.set(profile.name, row.id);
			}

			let quizAdded = false;
			for (const [index, record] of MOCK_COURSE_RECORDS.entries()) {
				const seed = COURSE_SEEDS[index];
				const [row] = await tx
					.insert(course)
					.values({
						name: record.title,
						slug: record.slug,
						subtitle: record.subtitle ?? '',
						shortDescription: record.shortDescription,
						description: record.description,
						categoryId: categoryIds.get(record.categoryId) ?? null,
						instructorId: instructorIds.get(record.presenterName) ?? null,
						thumbnail: record.thumbnailUrl ?? null,
						accessType: record.accessType,
						price: record.price,
						discountPrice: record.discountPrice,
						currency: record.currency,
						difficulty: record.difficulty,
						durationMinutes: record.estimatedDurationMinutes,
						language: seed.language,
						certificateEnabled: record.certificateEnabled,
						featured: record.featured,
						outcomes: lines(record.outcomes),
						requirements: lines(record.requirements),
						tags: lines(record.tags),
						status: true,
						publishedAt: record.publishedAt ? new Date(record.publishedAt) : new Date(),
						sortOrder: index
					})
					.$returningId();

				for (const [sectionIndex, section] of record.sections.entries()) {
					const [sectionRow] = await tx
						.insert(courseSection)
						.values({
							courseId: row.id,
							title: section.title,
							description: section.description,
							sortOrder: sectionIndex
						})
						.$returningId();
					for (const [lessonIndex, item] of section.lessons.entries()) {
						const [lessonRow] = await tx
							.insert(lesson)
							.values({
								sectionId: sectionRow.id,
								courseId: row.id,
								title: item.title,
								lessonType: item.lessonType,
								durationSeconds: item.durationSeconds,
								isPreview: item.isPreview,
								isMandatory: item.isMandatory,
								videoUrl: item.videoUrl ?? null,
								externalUrl: item.externalUrl ?? null,
								content: item.content ?? null,
								sortOrder: lessonIndex
							})
							.$returningId();
						const resources = (item.resources ?? []).filter((resource) => resource.externalUrl);
						if (resources.length > 0) {
							await tx.insert(lessonResource).values(
								resources.map((resource, resourceIndex) => ({
									lessonId: lessonRow.id,
									title: resource.title,
									url: resource.externalUrl!,
									sortOrder: resourceIndex
								}))
							);
						}
					}

					if (!quizAdded && record.accessType === 'FREE' && sectionIndex === record.sections.length - 1) {
						quizAdded = true;
						const [quizLesson] = await tx
							.insert(lesson)
							.values({
								sectionId: sectionRow.id,
								courseId: row.id,
								title: DEMO_QUIZ.title,
								lessonType: 'QUIZ',
								passingScore: 70,
								sortOrder: section.lessons.length
							})
							.$returningId();
						for (const [questionIndex, question] of DEMO_QUIZ.questions.entries()) {
							const [questionRow] = await tx
								.insert(quizQuestion)
								.values({
									lessonId: quizLesson.id,
									prompt: question.prompt,
									explanation: question.explanation,
									allowMultiple: question.options.filter((option) => option.isCorrect).length > 1,
									sortOrder: questionIndex
								})
								.$returningId();
							await tx.insert(quizOption).values(
								question.options.map((option, optionIndex) => ({
									questionId: questionRow.id,
									text: option.text,
									isCorrect: option.isCorrect,
									sortOrder: optionIndex
								}))
							);
						}
					}
				}
			}

			await tx.insert(testimonial).values(
				MOCK_TESTIMONIALS.map((entry, index) => ({
					studentName: entry.studentName,
					role: entry.role,
					courseTitle: entry.courseTitle,
					rating: entry.rating,
					quote: entry.quote,
					sortOrder: index
				}))
			);
		});
		console.log(
			`Seeded ${MOCK_CATEGORIES.length} categories, ${MOCK_COURSE_RECORDS.length} courses and ${MOCK_TESTIMONIALS.length} testimonials.`
		);
	}
} finally {
	await client.end();
}
