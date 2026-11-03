CREATE TABLE `events` (
	`session_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`occurred_at` text NOT NULL,
	`scene` text NOT NULL,
	`procedure` text NOT NULL,
	`action` text NOT NULL,
	`object` text,
	`value` text,
	`outcome` text NOT NULL,
	`context` text,
	PRIMARY KEY(`session_id`, `event_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_session_procedure_idx` ON `events` (`session_id`,`procedure`);--> statement-breakpoint
CREATE TABLE `invalid_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`line` integer NOT NULL,
	`reason` text NOT NULL,
	`raw` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invalid_events_session_idx` ON `invalid_events` (`session_id`);--> statement-breakpoint
CREATE TABLE `metric_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`indicator` text NOT NULL,
	`metric` text NOT NULL,
	`value_type` text NOT NULL,
	`value_bool` integer,
	`value_number` real,
	`value_text` text,
	`not_evaluable_reason` text,
	`config_version` integer NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`computed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metric_results_unique_idx` ON `metric_results` (`session_id`,`indicator`,`metric`);--> statement-breakpoint
CREATE TABLE `participants` (
	`code` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`participant_code` text NOT NULL,
	`phase` text NOT NULL,
	`case_id` text NOT NULL,
	`status` text NOT NULL,
	`incomplete_reason` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`duration_ms` integer,
	`app_version` text NOT NULL,
	`device_model` text NOT NULL,
	`device_os_version` text NOT NULL,
	`contract_version` text NOT NULL,
	`event_count` integer DEFAULT 0 NOT NULL,
	`invalid_event_count` integer DEFAULT 0 NOT NULL,
	`received_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`participant_code`) REFERENCES `participants`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_client_id_idx` ON `sessions` (`client_id`);--> statement-breakpoint
CREATE INDEX `sessions_participant_idx` ON `sessions` (`participant_code`);--> statement-breakpoint
CREATE INDEX `sessions_started_idx` ON `sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE `study_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`description` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);