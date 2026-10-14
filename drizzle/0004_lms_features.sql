CREATE TABLE `course_review` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`status` enum('PUBLISHED','HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_review_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_review_user_course_unique` UNIQUE(`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_position` (
	`user_id` varchar(36) NOT NULL,
	`lesson_id` int NOT NULL,
	`position_seconds` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_position_user_id_lesson_id_pk` PRIMARY KEY(`user_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` varchar(60) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(500),
	`link` varchar(500),
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempt` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`lesson_id` int NOT NULL,
	`score` int NOT NULL,
	`passed` boolean NOT NULL,
	`answers` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_attempt_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_option` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_id` int NOT NULL,
	`text` varchar(500) NOT NULL,
	`is_correct` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `quiz_option_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_question` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lesson_id` int NOT NULL,
	`prompt` text NOT NULL,
	`explanation` text,
	`allow_multiple` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `quiz_question_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlist_item` (
	`user_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlist_item_user_id_course_id_pk` PRIMARY KEY(`user_id`,`course_id`)
);
--> statement-breakpoint
ALTER TABLE `lesson` MODIFY COLUMN `lesson_type` enum('VIDEO','TEXT','DOCUMENT','DOWNLOAD','EXTERNAL_LINK','QUIZ') NOT NULL DEFAULT 'VIDEO';--> statement-breakpoint
ALTER TABLE `lesson_resource` MODIFY COLUMN `url` varchar(500);--> statement-breakpoint
ALTER TABLE `enrollment` ADD `last_lesson_id` int;--> statement-breakpoint
ALTER TABLE `enrollment` ADD `last_activity_at` timestamp;--> statement-breakpoint
ALTER TABLE `lesson` ADD `passing_score` int;--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD `file` varchar(255);--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD `file_name` varchar(255);--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD `file_size` int;--> statement-breakpoint
ALTER TABLE `lesson_resource` ADD `mime_type` varchar(120);--> statement-breakpoint
ALTER TABLE `course_review` ADD CONSTRAINT `course_review_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_review` ADD CONSTRAINT `course_review_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_position` ADD CONSTRAINT `lesson_position_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_position` ADD CONSTRAINT `lesson_position_lesson_id_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_lesson_id_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_option` ADD CONSTRAINT `quiz_option_question_id_quiz_question_id_fk` FOREIGN KEY (`question_id`) REFERENCES `quiz_question`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_question` ADD CONSTRAINT `quiz_question_lesson_id_lesson_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_item` ADD CONSTRAINT `wishlist_item_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_item` ADD CONSTRAINT `wishlist_item_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_review_course_idx` ON `course_review` (`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `notification` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `quiz_attempt_user_lesson_idx` ON `quiz_attempt` (`user_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `quiz_option_question_idx` ON `quiz_option` (`question_id`);--> statement-breakpoint
CREATE INDEX `quiz_question_lesson_idx` ON `quiz_question` (`lesson_id`);--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_last_lesson_id_lesson_id_fk` FOREIGN KEY (`last_lesson_id`) REFERENCES `lesson`(`id`) ON DELETE set null ON UPDATE no action;