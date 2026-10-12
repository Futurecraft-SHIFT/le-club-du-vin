CREATE TABLE `admins` (
	`slot` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_user_id_unique` ON `admins` (`user_id`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`day` text NOT NULL,
	`section` text
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `last_seen_at` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `analytics_consent` integer;--> statement-breakpoint
ALTER TABLE `profiles` ADD `consent_updated_at` text;