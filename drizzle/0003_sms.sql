CREATE TABLE `sms_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`to` varchar(20) NOT NULL,
	`kind` varchar(60) NOT NULL,
	`message` varchar(400) NOT NULL,
	`status` enum('SENT','FAILED','SKIPPED') NOT NULL,
	`error` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `phone_number` varchar(20);--> statement-breakpoint
ALTER TABLE `user` ADD `phone_number_verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_phone_number_unique` UNIQUE(`phone_number`);--> statement-breakpoint
CREATE INDEX `sms_log_created_idx` ON `sms_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `sms_log_to_idx` ON `sms_log` (`to`);