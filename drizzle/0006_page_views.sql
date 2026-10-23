CREATE TABLE `page_view` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`visitor` varchar(16) NOT NULL,
	`path` varchar(255) NOT NULL,
	`route` varchar(120),
	`locale` varchar(5) NOT NULL,
	`referrer` varchar(255),
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(100),
	`device` enum('mobile','tablet','desktop') NOT NULL,
	`browser` varchar(30) NOT NULL,
	`os` varchar(30) NOT NULL,
	`country` varchar(2),
	`signed_in` boolean NOT NULL DEFAULT false,
	CONSTRAINT `page_view_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `page_view_created_idx` ON `page_view` (`created_at`);--> statement-breakpoint
CREATE INDEX `page_view_route_idx` ON `page_view` (`route`,`created_at`);