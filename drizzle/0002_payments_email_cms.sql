CREATE TABLE `chapa_payment` (
	`tx_ref` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ETB',
	`promo_code_id` int,
	`discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
	`chapa_reference` varchar(120),
	`failure_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`verified_at` timestamp,
	CONSTRAINT `chapa_payment_tx_ref` PRIMARY KEY(`tx_ref`)
);
--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`to` varchar(255) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`kind` varchar(60) NOT NULL,
	`html` text NOT NULL,
	`status` enum('SENT','FAILED','SKIPPED') NOT NULL,
	`error` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promo_code` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`description` varchar(255),
	`discount_type` enum('PERCENT','FIXED') NOT NULL DEFAULT 'PERCENT',
	`discount_value` decimal(10,2) NOT NULL,
	`course_id` int,
	`max_redemptions` int,
	`starts_at` timestamp,
	`ends_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`status` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `promo_code_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_code_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `site_setting` (
	`key` varchar(60) NOT NULL,
	`value` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_setting_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `enrollment` ADD `payment_provider` enum('FREE','MANUAL','CHAPA') DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `enrollment` ADD `promo_code_id` int;--> statement-breakpoint
ALTER TABLE `enrollment` ADD `discount_amount` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `enrollment` ADD `paid_at` timestamp;--> statement-breakpoint
ALTER TABLE `chapa_payment` ADD CONSTRAINT `chapa_payment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapa_payment` ADD CONSTRAINT `chapa_payment_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chapa_payment` ADD CONSTRAINT `chapa_payment_promo_code_id_promo_code_id_fk` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_code`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_code` ADD CONSTRAINT `promo_code_course_id_course_id_fk` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_code` ADD CONSTRAINT `promo_code_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chapa_user_course_idx` ON `chapa_payment` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `chapa_status_idx` ON `chapa_payment` (`status`);--> statement-breakpoint
CREATE INDEX `email_log_created_idx` ON `email_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_log_kind_idx` ON `email_log` (`kind`);--> statement-breakpoint
ALTER TABLE `enrollment` ADD CONSTRAINT `enrollment_promo_code_id_promo_code_id_fk` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_code`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE `enrollment` SET `payment_provider` = 'FREE' WHERE `amount` = 0;--> statement-breakpoint
UPDATE `enrollment` SET `paid_at` = COALESCE(`reviewed_at`, `created_at`) WHERE `status` = 'ACTIVE' AND `amount` > 0;
