ALTER TABLE `users` ADD COLUMN `permissions` text NOT NULL DEFAULT ('[]');
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `last_login_at` timestamp NULL;
