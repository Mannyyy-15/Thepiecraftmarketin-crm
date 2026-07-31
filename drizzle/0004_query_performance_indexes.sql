CREATE INDEX `users_organization_idx` ON `users` (`organization_id`);
--> statement-breakpoint
CREATE INDEX `clients_org_name_idx` ON `clients` (`organization_id`, `name`);
--> statement-breakpoint
CREATE INDEX `projects_org_created_idx` ON `projects` (`organization_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `projects_client_created_idx` ON `projects` (`client_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `projects_project_type_idx` ON `projects` (`project_type`);
--> statement-breakpoint
CREATE INDEX `projects_billing_status_idx` ON `projects` (`billing_model`, `status`);
--> statement-breakpoint
CREATE INDEX `invoices_org_created_idx` ON `invoices` (`organization_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `invoices_client_created_idx` ON `invoices` (`client_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `invoices_project_created_idx` ON `invoices` (`project_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);
--> statement-breakpoint
CREATE INDEX `tasks_user_created_idx` ON `tasks` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `tasks_project_created_idx` ON `tasks` (`project_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `attendance_user_date_idx` ON `attendance` (`user_id`, `date`);
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`, `read`);
--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`created_at`);
--> statement-breakpoint
CREATE INDEX `leads_org_created_idx` ON `leads` (`organization_id`, `created_at`);
