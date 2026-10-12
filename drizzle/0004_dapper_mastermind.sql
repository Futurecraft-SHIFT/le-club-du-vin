CREATE TABLE `catalog_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_sync` (
	`origin` text PRIMARY KEY NOT NULL,
	`last_checked_at` text NOT NULL,
	`last_page` integer NOT NULL,
	`complete` integer NOT NULL
);
