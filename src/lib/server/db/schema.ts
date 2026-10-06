export * from './auth.schema';
import {
	mysqlTable,
	int,
	varchar,
	text,
	boolean,
	timestamp,
	mysqlEnum,
	decimal,
	json,
	index,
	primaryKey,
	unique
} from 'drizzle-orm/mysql-core';
import { fieldMixins } from '@nahu/admin-kit/server/schema';
import { user } from './auth.schema';

export const { lesserFields } = fieldMixins(() => user.id);

export const staffRole = mysqlTable('staff_role', {
	userId: varchar('user_id', { length: 36 })
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	role: mysqlEnum('role', ['admin', 'editor']).notNull()
});

export const category = mysqlTable('category', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 120 }).notNull(),
	slug: varchar('slug', { length: 120 }).notNull().unique(),
	description: text('description'),
	sortOrder: int('sort_order').notNull().default(0),
	...lesserFields
});

/**
 * People who present courses. Separate from `user`: an instructor needs a public profile, not an
 * account, and most will never sign in.
 */
export const instructor = mysqlTable('instructor', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 120 }).notNull(),
	slug: varchar('slug', { length: 120 }).notNull().unique(),
	title: varchar('title', { length: 180 }).notNull().default('Academy Instructor'),
	bio: text('bio'),
	/** A kit-stored upload, or a path under /static for seeded profiles. */
	photo: varchar('photo', { length: 255 }),
	/** One entry per line in the dashboard form. */
	skills: text('skills'),
	achievements: text('achievements'),
	sortOrder: int('sort_order').notNull().default(0),
	...lesserFields
});

export const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const;
export const ACCESS_TYPES = ['FREE', 'PAID'] as const;

export const course = mysqlTable(
	'course',
	{
		id: int('id').autoincrement().primaryKey(),
		name: varchar('name', { length: 180 }).notNull(),
		slug: varchar('slug', { length: 180 }).notNull().unique(),
		subtitle: varchar('subtitle', { length: 255 }).notNull().default(''),
		shortDescription: varchar('short_description', { length: 500 }).notNull().default(''),
		description: text('description').notNull(),
		categoryId: int('category_id').references(() => category.id, { onDelete: 'set null' }),
		instructorId: int('instructor_id').references(() => instructor.id, { onDelete: 'set null' }),
		/** A kit-stored upload, or a path under /static for seeded courses. */
		thumbnail: varchar('thumbnail', { length: 255 }),
		accessType: mysqlEnum('access_type', ACCESS_TYPES).notNull().default('FREE'),
		price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
		discountPrice: decimal('discount_price', { precision: 10, scale: 2 }),
		currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
		difficulty: mysqlEnum('difficulty', DIFFICULTIES).notNull().default('BEGINNER'),
		durationMinutes: int('duration_minutes'),
		language: varchar('language', { length: 80 }).notNull().default('English'),
		certificateEnabled: boolean('certificate_enabled').notNull().default(true),
		featured: boolean('featured').notNull().default(false),
		/** One entry per line in the dashboard form. */
		outcomes: text('outcomes'),
		requirements: text('requirements'),
		tags: text('tags'),
		/** Published to the public site. */
		status: boolean('status').notNull().default(false),
		publishedAt: timestamp('published_at'),
		sortOrder: int('sort_order').notNull().default(0),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('course_category_idx').on(table.categoryId), index('course_instructor_idx').on(table.instructorId)]
);

export const courseSection = mysqlTable(
	'course_section',
	{
		id: int('id').autoincrement().primaryKey(),
		courseId: int('course_id')
			.notNull()
			.references(() => course.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 180 }).notNull(),
		description: text('description'),
		sortOrder: int('sort_order').notNull().default(0)
	},
	(table) => [index('section_course_idx').on(table.courseId)]
);

export const LESSON_TYPES = ['VIDEO', 'TEXT', 'DOCUMENT', 'DOWNLOAD', 'EXTERNAL_LINK'] as const;

export const lesson = mysqlTable(
	'lesson',
	{
		id: int('id').autoincrement().primaryKey(),
		sectionId: int('section_id')
			.notNull()
			.references(() => courseSection.id, { onDelete: 'cascade' }),
		/** Denormalised from the section so access checks and progress counts need no join. */
		courseId: int('course_id')
			.notNull()
			.references(() => course.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 200 }).notNull(),
		lessonType: mysqlEnum('lesson_type', LESSON_TYPES).notNull().default('VIDEO'),
		durationSeconds: int('duration_seconds'),
		/** Free to watch without enrolling. */
		isPreview: boolean('is_preview').notNull().default(false),
		/** Counts toward completion and the certificate. */
		isMandatory: boolean('is_mandatory').notNull().default(true),
		videoUrl: varchar('video_url', { length: 500 }),
		externalUrl: varchar('external_url', { length: 500 }),
		/** Sanitised HTML. */
		content: text('content'),
		sortOrder: int('sort_order').notNull().default(0)
	},
	(table) => [index('lesson_section_idx').on(table.sectionId), index('lesson_course_idx').on(table.courseId)]
);

export const lessonResource = mysqlTable(
	'lesson_resource',
	{
		id: int('id').autoincrement().primaryKey(),
		lessonId: int('lesson_id')
			.notNull()
			.references(() => lesson.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 200 }).notNull(),
		url: varchar('url', { length: 500 }).notNull(),
		sortOrder: int('sort_order').notNull().default(0)
	},
	(table) => [index('resource_lesson_idx').on(table.lessonId)]
);

/** Bank accounts and wallets a student can pay a course fee into. */
export const paymentMethod = mysqlTable('payment_method', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 120 }).notNull(),
	accountName: varchar('account_name', { length: 160 }).notNull(),
	accountNumber: varchar('account_number', { length: 80 }).notNull(),
	instructions: text('instructions'),
	sortOrder: int('sort_order').notNull().default(0),
	...lesserFields
});

export const ENROLLMENT_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED'] as const;
export const PAYMENT_PROVIDERS = ['FREE', 'MANUAL', 'CHAPA'] as const;
export const DISCOUNT_TYPES = ['PERCENT', 'FIXED'] as const;

/**
 * A discount code entered at checkout. Redemptions are counted from enrollments (and pending Chapa
 * payments) that carry the code, so there is no counter to drift.
 */
export const promoCode = mysqlTable('promo_code', {
	id: int('id').autoincrement().primaryKey(),
	/** Stored upper-case; matched case-insensitively. */
	code: varchar('code', { length: 40 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	discountType: mysqlEnum('discount_type', DISCOUNT_TYPES).notNull().default('PERCENT'),
	/** A percentage (1-100) or an amount in the course's currency. */
	discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
	/** Only this course; null for every paid course. */
	courseId: int('course_id').references(() => course.id, { onDelete: 'cascade' }),
	maxRedemptions: int('max_redemptions'),
	startsAt: timestamp('starts_at'),
	endsAt: timestamp('ends_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	...lesserFields
});

/**
 * A student's place on a course. Free courses start ACTIVE; paid ones start PENDING with a receipt
 * and become ACTIVE when staff approve the payment.
 */
export const enrollment = mysqlTable(
	'enrollment',
	{
		id: int('id').autoincrement().primaryKey(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		courseId: int('course_id')
			.notNull()
			.references(() => course.id, { onDelete: 'cascade' }),
		status: mysqlEnum('status', ENROLLMENT_STATUSES).notNull().default('PENDING'),
		/** What the student was asked to pay, fixed at checkout. */
		amount: decimal('amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
		currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
		paymentMethodId: int('payment_method_id').references(() => paymentMethod.id, { onDelete: 'set null' }),
		/** The uploaded payment receipt (a kit-stored file name). */
		receipt: varchar('receipt', { length: 255 }),
		transactionReference: varchar('transaction_reference', { length: 120 }),
		reviewedBy: varchar('reviewed_by', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
		reviewedAt: timestamp('reviewed_at'),
		rejectionReason: varchar('rejection_reason', { length: 500 }),
		/** How the place was paid for: nothing (free or 100% promo), a reviewed receipt, or Chapa. */
		paymentProvider: mysqlEnum('payment_provider', PAYMENT_PROVIDERS).notNull().default('MANUAL'),
		promoCodeId: int('promo_code_id').references(() => promoCode.id, { onDelete: 'set null' }),
		/** Taken off the course price by the promo code; `amount` is what remained to pay. */
		discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
		/** When the money was confirmed (receipt approved or Chapa verified): the revenue date. */
		paidAt: timestamp('paid_at'),
		completedAt: timestamp('completed_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		unique('enrollment_user_course_unique').on(table.userId, table.courseId),
		index('enrollment_course_idx').on(table.courseId),
		index('enrollment_status_idx').on(table.status)
	]
);

export const lessonProgress = mysqlTable(
	'lesson_progress',
	{
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		lessonId: int('lesson_id')
			.notNull()
			.references(() => lesson.id, { onDelete: 'cascade' }),
		completedAt: timestamp('completed_at').defaultNow().notNull()
	},
	(table) => [primaryKey({ columns: [table.userId, table.lessonId] })]
);

/**
 * Issued when a student completes a certificate-enabled course. Names are copied in at issue time
 * so a later rename of the student or course never changes a certificate already handed out.
 */
export const certificate = mysqlTable(
	'certificate',
	{
		id: int('id').autoincrement().primaryKey(),
		/** Printed on the certificate: JTA-2026-000123. */
		code: varchar('code', { length: 32 }).notNull().unique(),
		/** Unguessable, for the QR code's verification link. */
		token: varchar('token', { length: 64 }).notNull().unique(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		courseId: int('course_id')
			.notNull()
			.references(() => course.id, { onDelete: 'cascade' }),
		recipientName: varchar('recipient_name', { length: 255 }).notNull(),
		courseTitle: varchar('course_title', { length: 180 }).notNull(),
		instructorName: varchar('instructor_name', { length: 120 }),
		issuedAt: timestamp('issued_at').defaultNow().notNull(),
		revokedAt: timestamp('revoked_at'),
		revokedReason: varchar('revoked_reason', { length: 500 })
	},
	(table) => [unique('certificate_user_course_unique').on(table.userId, table.courseId)]
);

export const testimonial = mysqlTable('testimonial', {
	id: int('id').autoincrement().primaryKey(),
	studentName: varchar('student_name', { length: 120 }).notNull(),
	role: varchar('role', { length: 160 }).notNull().default(''),
	courseTitle: varchar('course_title', { length: 180 }).notNull().default(''),
	rating: int('rating').notNull().default(5),
	quote: text('quote').notNull(),
	sortOrder: int('sort_order').notNull().default(0),
	...lesserFields
});

export const newsletterSubscriber = mysqlTable('newsletter_subscriber', {
	id: int('id').autoincrement().primaryKey(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const contactMessage = mysqlTable(
	'contact_message',
	{
		id: int('id').autoincrement().primaryKey(),
		name: varchar('name', { length: 120 }).notNull(),
		email: varchar('email', { length: 255 }).notNull(),
		message: text('message').notNull(),
		status: mysqlEnum('status', ['NEW', 'READ']).notNull().default('NEW'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('contact_status_idx').on(table.status)]
);

export const CHAPA_STATUSES = ['PENDING', 'PAID', 'FAILED'] as const;

/**
 * One attempt to pay for a course through Chapa. The enrollment is only created once Chapa's
 * verify API confirms the money, so an abandoned checkout leaves nothing behind but this row.
 */
export const chapaPayment = mysqlTable(
	'chapa_payment',
	{
		txRef: varchar('tx_ref', { length: 64 }).primaryKey(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		courseId: int('course_id')
			.notNull()
			.references(() => course.id, { onDelete: 'cascade' }),
		amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
		currency: varchar('currency', { length: 3 }).notNull().default('ETB'),
		promoCodeId: int('promo_code_id').references(() => promoCode.id, { onDelete: 'set null' }),
		discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
		status: mysqlEnum('status', CHAPA_STATUSES).notNull().default('PENDING'),
		/** Chapa's own reference, from the verify response. */
		chapaReference: varchar('chapa_reference', { length: 120 }),
		failureReason: varchar('failure_reason', { length: 500 }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		verifiedAt: timestamp('verified_at')
	},
	(table) => [index('chapa_user_course_idx').on(table.userId, table.courseId), index('chapa_status_idx').on(table.status)]
);

export const EMAIL_STATUSES = ['SENT', 'FAILED', 'SKIPPED'] as const;

/**
 * Every email the app tried to send. SKIPPED means no SMTP server is configured (development):
 * the message is kept here so its links can still be followed.
 */
export const emailLog = mysqlTable(
	'email_log',
	{
		id: int('id').autoincrement().primaryKey(),
		to: varchar('to', { length: 255 }).notNull(),
		subject: varchar('subject', { length: 255 }).notNull(),
		/** What the email was for, e.g. `password-reset`, for filtering. */
		kind: varchar('kind', { length: 60 }).notNull(),
		html: text('html').notNull(),
		status: mysqlEnum('status', EMAIL_STATUSES).notNull(),
		error: varchar('error', { length: 500 }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('email_log_created_idx').on(table.createdAt), index('email_log_kind_idx').on(table.kind)]
);

/** Editable site content (the landing page and its announcement bar), one JSON document per key. */
export const siteSetting = mysqlTable('site_setting', {
	key: varchar('key', { length: 60 }).primaryKey(),
	value: json('value').notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

/**
 * Every SMS the app tried to send (GeezSMS). SKIPPED means no SMS_KEY is configured. The message
 * text is kept so staff can see exactly what a student received.
 */
export const smsLog = mysqlTable(
	'sms_log',
	{
		id: int('id').autoincrement().primaryKey(),
		/** Normalised 2519…/2517… number. */
		to: varchar('to', { length: 20 }).notNull(),
		/** What the text was for (`otp`, `enrollment-confirmed`, …), for filtering. */
		kind: varchar('kind', { length: 60 }).notNull(),
		message: varchar('message', { length: 400 }).notNull(),
		status: mysqlEnum('status', EMAIL_STATUSES).notNull(),
		error: varchar('error', { length: 500 }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('sms_log_created_idx').on(table.createdAt), index('sms_log_to_idx').on(table.to)]
);
