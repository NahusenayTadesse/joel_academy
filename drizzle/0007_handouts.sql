CREATE TABLE `course_handout` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course_id` int NOT NULL,
	`section_id` int,
	`title` varchar(200) NOT NULL,
	`summary` varchar(500),
	`style` enum('DOCUMENT','CHECKLIST','WORKSHEET') NOT NULL DEFAULT 'DOCUMENT',
	`audience` enum('STUDENTS','PUBLIC') NOT NULL DEFAULT 'STUDENTS',
	`content` text,
	`published` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_handout_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `course_handout` ADD CONSTRAINT `course_handout_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_handout` ADD CONSTRAINT `course_handout_section_id_course_section_id_fk` FOREIGN KEY (`section_id`) REFERENCES `course_section`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `handout_course_idx` ON `course_handout` (`course_id`);--> statement-breakpoint
CREATE INDEX `handout_section_idx` ON `course_handout` (`section_id`);