CREATE TABLE `category` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `category_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `certificate` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`token` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`recipient_name` varchar(255) NOT NULL,
	`course_title` varchar(180) NOT NULL,
	`instructor_name` varchar(120),
	`issued_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`revoked_reason` varchar(500),
	CONSTRAINT `certificate_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificate_code_unique` UNIQUE(`code`),
	CONSTRAINT `certificate_token_unique` UNIQUE(`token`),
	CONSTRAINT `certificate_user_course_unique` UNIQUE(`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `contact_message` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`status` enum('NEW','READ') NOT NULL DEFAULT 'NEW',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_section` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course_id` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `course_section_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`status` enum('PENDING','ACTIVE','REJECTED') NOT NULL DEFAULT 'PENDING',
	`amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL DEFAULT 'ETB',
	`payment_method_id` int,
	`receipt` varchar(255),
	`transaction_reference` varchar(120),
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp,
	`rejection_reason` varchar(500),
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enrollment_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollment_user_course_unique` UNIQUE(`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `instructor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title` varchar(180) NOT NULL DEFAULT 'Academy Instructor',
	`bio` text,
	`photo` varchar(255),
	`skills` text,
	`achievements` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `instructor_id` PRIMARY KEY(`id`),
	CONSTRAINT `instructor_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section_id` int NOT NULL,
	`course_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`lesson_type` enum('VIDEO','TEXT','DOCUMENT','DOWNLOAD','EXTERNAL_LINK') NOT NULL DEFAULT 'VIDEO',
	`duration_seconds` int,
	`is_preview` boolean NOT NULL DEFAULT false,
	`is_mandatory` boolean NOT NULL DEFAULT true,
	`video_url` varchar(500),
	`external_url` varchar(500),
	`content` text,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `lesson_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`user_id` varchar(36) NOT NULL,
	`lesson_id` int NOT NULL,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_progress_user_id_lesson_id_pk` PRIMARY KEY(`user_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_resource` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lesson_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`url` varchar(500) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `lesson_resource_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscriber` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletter_subscriber_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscriber_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`account_name` varchar(160) NOT NULL,
	`account_number` varchar(80) NOT NULL,
	`instructions` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `payment_method_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonial` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_name` varchar(120) NOT NULL,
	`role` varchar(160) NOT NULL DEFAULT '',
	`course_title` varchar(180) NOT NULL DEFAULT '',
	`rating` int NOT NULL DEFAULT 5,
	`quote` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `testimonial_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `course` ADD `subtitle` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `short_description` varchar(500) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `category_id` int;--> statement-breakpoint
ALTER TABLE `course` ADD `instructor_id` int;--> statement-breakpoint
ALTER TABLE `course` ADD `thumbnail` varchar(255);--> statement-breakpoint
ALTER TABLE `course` ADD `access_type` enum('FREE','PAID') DEFAULT 'FREE' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `price` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `discount_price` decimal(10,2);--> statement-breakpoint
ALTER TABLE `course` ADD `currency` varchar(3) DEFAULT 'ETB' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `difficulty` enum('BEGINNER','INTERMEDIATE','ADVANCED','ALL_LEVELS') DEFAULT 'BEGINNER' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `duration_minutes` int;--> statement-breakpoint
ALTER TABLE `course` ADD `language` varchar(80) DEFAULT 'English' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `certificate_enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `featured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `outcomes` text;--> statement-breakpoint
ALTER TABLE `course` ADD `requirements` text;--> statement-breakpoint
ALTER TABLE `course` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `course` ADD `published_at` timestamp;--> statement-breakpoint
ALTER TABLE `category` ADD CONSTRAINT `category_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate` ADD CONSTRAINT `certificate_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_section` ADD CONSTRAINT `course_section_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_payment_method_id_payment_method_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instructor` ADD CONSTRAINT `instructor_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson` ADD CONSTRAINT `lesson_section_id_course_section_id_fk` FOREIGN KEY (`section_id`) REFERENCES `course_section`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson` ADD CONSTRAINT `lesson_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_lesson_id_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD CONSTRAINT `lesson_resource_lesson_id_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_method` ADD CONSTRAINT `payment_method_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testimonial` ADD CONSTRAINT `testimonial_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contact_status_idx` ON `contact_message` (`status`);--> statement-breakpoint
CREATE INDEX `section_course_idx` ON `course_section` (`course_id`);--> statement-breakpoint
CREATE INDEX `enrollment_course_idx` ON `enrollment` (`course_id`);--> statement-breakpoint
CREATE INDEX `enrollment_status_idx` ON `enrollment` (`status`);--> statement-breakpoint
CREATE INDEX `lesson_section_idx` ON `lesson` (`section_id`);--> statement-breakpoint
CREATE INDEX `lesson_course_idx` ON `lesson` (`course_id`);--> statement-breakpoint
CREATE INDEX `resource_lesson_idx` ON `lesson_resource` (`lesson_id`);--> statement-breakpoint
ALTER TABLE `course` ADD CONSTRAINT `course_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course` ADD CONSTRAINT `course_instructor_id_instructor_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `instructor`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_category_idx` ON `course` (`category_id`);--> statement-breakpoint
CREATE INDEX `course_instructor_idx` ON `course` (`instructor_id`);