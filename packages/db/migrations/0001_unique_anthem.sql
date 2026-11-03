CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`criteria` text,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cases_label_idx` ON `cases` (`label`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`participant_code` text NOT NULL,
	`phase` text NOT NULL,
	`case_id` text NOT NULL,
	`case_version` integer DEFAULT 1 NOT NULL,
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
	FOREIGN KEY (`participant_code`) REFERENCES `participants`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "client_id", "participant_code", "phase", "case_id", "case_version", "status", "incomplete_reason", "started_at", "finished_at", "duration_ms", "app_version", "device_model", "device_os_version", "contract_version", "event_count", "invalid_event_count", "received_at") SELECT "id", "client_id", "participant_code", "phase", "case_id", 1, "status", "incomplete_reason", "started_at", "finished_at", "duration_ms", "app_version", "device_model", "device_os_version", "contract_version", "event_count", "invalid_event_count", "received_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_client_id_idx` ON `sessions` (`client_id`);--> statement-breakpoint
CREATE INDEX `sessions_participant_idx` ON `sessions` (`participant_code`);--> statement-breakpoint
CREATE INDEX `sessions_started_idx` ON `sessions` (`started_at`);