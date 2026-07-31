-- Additive, backfill-safe tenant and normalized CRM foundation.
-- Existing records are assigned to one internal organization; no legacy row is deleted.

CREATE TABLE `organizations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `status` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
  `plan` varchar(50) NOT NULL DEFAULT 'internal',
  `timezone` varchar(100) NOT NULL DEFAULT 'Asia/Kolkata',
  `base_currency` varchar(10) NOT NULL DEFAULT 'INR',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organizations_id` PRIMARY KEY (`id`),
  CONSTRAINT `organizations_slug_unique` UNIQUE (`slug`),
  INDEX `organizations_status_idx` (`status`)
);
--> statement-breakpoint
INSERT INTO `organizations` (`name`, `slug`, `plan`)
SELECT 'ThePieCraft', 'thepiecraft', 'internal'
WHERE NOT EXISTS (SELECT 1 FROM `organizations` WHERE `slug` = 'thepiecraft');
--> statement-breakpoint
SET @default_organization_id = (SELECT `id` FROM `organizations` WHERE `slug` = 'thepiecraft' LIMIT 1);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `organization_id` int NULL;
--> statement-breakpoint
ALTER TABLE `clients` ADD COLUMN `organization_id` int NULL, ADD COLUMN `account_id` int NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `organization_id` int NULL, ADD COLUMN `account_id` int NULL, ADD COLUMN `deal_id` int NULL;
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `organization_id` int NULL;
--> statement-breakpoint
ALTER TABLE `leads`
  ADD COLUMN `organization_id` int NULL,
  ADD COLUMN `account_id` int NULL,
  ADD COLUMN `contact_id` int NULL,
  ADD COLUMN `converted_deal_id` int NULL,
  ADD COLUMN `utm_source` varchar(255) NULL,
  ADD COLUMN `utm_medium` varchar(255) NULL,
  ADD COLUMN `utm_campaign` varchar(255) NULL,
  ADD COLUMN `utm_term` varchar(255) NULL,
  ADD COLUMN `utm_content` varchar(255) NULL,
  ADD COLUMN `gclid` varchar(255) NULL,
  ADD COLUMN `gbraid` varchar(255) NULL,
  ADD COLUMN `wbraid` varchar(255) NULL,
  ADD COLUMN `fbclid` varchar(255) NULL,
  ADD COLUMN `landing_page_url` varchar(1000) NULL,
  ADD COLUMN `referrer_url` varchar(1000) NULL,
  ADD COLUMN `attribution_data` text NULL;
--> statement-breakpoint
UPDATE `users` SET `organization_id` = @default_organization_id WHERE `organization_id` IS NULL;
--> statement-breakpoint
UPDATE `clients` SET `organization_id` = @default_organization_id WHERE `organization_id` IS NULL;
--> statement-breakpoint
UPDATE `projects` SET `organization_id` = @default_organization_id WHERE `organization_id` IS NULL;
--> statement-breakpoint
UPDATE `invoices` SET `organization_id` = @default_organization_id WHERE `organization_id` IS NULL;
--> statement-breakpoint
UPDATE `leads` SET `organization_id` = @default_organization_id WHERE `organization_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `organization_memberships` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('owner','admin','manager','member','client') NOT NULL DEFAULT 'member',
  `status` enum('invited','active','suspended') NOT NULL DEFAULT 'active',
  `invited_by_id` int NULL,
  `joined_at` timestamp NULL DEFAULT (now()),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organization_memberships_id` PRIMARY KEY (`id`),
  CONSTRAINT `organization_memberships_org_user_unique` UNIQUE (`organization_id`,`user_id`),
  CONSTRAINT `organization_memberships_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organization_memberships_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organization_memberships_inviter_fk` FOREIGN KEY (`invited_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `organization_memberships_user_status_idx` (`user_id`,`status`)
);
--> statement-breakpoint
INSERT IGNORE INTO `organization_memberships` (`organization_id`, `user_id`, `role`, `status`, `joined_at`)
SELECT @default_organization_id, `id`,
  CASE `role` WHEN 'admin' THEN 'admin' WHEN 'client' THEN 'client' ELSE 'member' END,
  'active', `created_at`
FROM `users`;
--> statement-breakpoint
UPDATE `organization_memberships`
SET `role` = 'owner'
WHERE `organization_id` = @default_organization_id
  AND `user_id` = (SELECT `id` FROM `users` WHERE `role` = 'admin' ORDER BY `id` LIMIT 1);
--> statement-breakpoint
CREATE TABLE `accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `legal_name` varchar(255) NULL,
  `website` varchar(500) NULL,
  `industry` varchar(100) NULL,
  `status` enum('prospect','active','inactive','archived') NOT NULL DEFAULT 'prospect',
  `owner_id` int NULL,
  `billing_email` varchar(255) NULL,
  `phone` varchar(50) NULL,
  `metadata` text NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `accounts_id` PRIMARY KEY (`id`),
  CONSTRAINT `accounts_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `accounts_owner_fk` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `accounts_org_name_idx` (`organization_id`,`name`)
);
--> statement-breakpoint
INSERT INTO `accounts` (`organization_id`, `name`, `status`, `owner_id`, `metadata`, `created_at`)
SELECT COALESCE(`organization_id`, @default_organization_id), `name`, 'active', `owner_id`,
  JSON_OBJECT('legacyClientId', `id`), `created_at`
FROM `clients`;
--> statement-breakpoint
UPDATE `clients` c
JOIN `accounts` a
  ON a.`organization_id` = c.`organization_id`
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(a.`metadata`, '$.legacyClientId')) AS UNSIGNED) = c.`id`
SET c.`account_id` = a.`id`
WHERE c.`account_id` IS NULL;
--> statement-breakpoint
CREATE TABLE `contacts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `account_id` int NULL,
  `first_name` varchar(120) NOT NULL,
  `last_name` varchar(120) NULL,
  `email` varchar(255) NULL,
  `phone` varchar(50) NULL,
  `job_title` varchar(120) NULL,
  `lifecycle_stage` varchar(50) NOT NULL DEFAULT 'lead',
  `owner_id` int NULL,
  `consent_status` varchar(50) NOT NULL DEFAULT 'unknown',
  `metadata` text NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contacts_id` PRIMARY KEY (`id`),
  CONSTRAINT `contacts_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `contacts_account_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `contacts_owner_fk` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `contacts_org_email_idx` (`organization_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `account_contacts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `account_id` int NOT NULL,
  `contact_id` int NOT NULL,
  `relationship` varchar(50) NOT NULL DEFAULT 'stakeholder',
  `is_primary` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `account_contacts_id` PRIMARY KEY (`id`),
  CONSTRAINT `account_contacts_unique` UNIQUE (`account_id`,`contact_id`),
  CONSTRAINT `account_contacts_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `account_contacts_account_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `account_contacts_contact_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `deal_stages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `probability` int NOT NULL DEFAULT 0,
  `kind` enum('open','won','lost') NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `deal_stages_id` PRIMARY KEY (`id`),
  CONSTRAINT `deal_stages_org_name_unique` UNIQUE (`organization_id`,`name`),
  CONSTRAINT `deal_stages_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `deal_stages` (`organization_id`,`name`,`position`,`probability`,`kind`) VALUES
(@default_organization_id,'Qualified',10,20,'open'),
(@default_organization_id,'Proposal',20,50,'open'),
(@default_organization_id,'Negotiation',30,75,'open'),
(@default_organization_id,'Won',40,100,'won'),
(@default_organization_id,'Lost',50,0,'lost');
--> statement-breakpoint
CREATE TABLE `deals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `account_id` int NULL,
  `primary_contact_id` int NULL,
  `stage_id` int NULL,
  `owner_id` int NULL,
  `name` varchar(255) NOT NULL,
  `status` enum('open','won','lost') NOT NULL DEFAULT 'open',
  `amount` int NOT NULL DEFAULT 0,
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `expected_close_date` varchar(10) NULL,
  `closed_at` timestamp NULL,
  `lost_reason` varchar(255) NULL,
  `utm_source` varchar(255) NULL, `utm_medium` varchar(255) NULL,
  `utm_campaign` varchar(255) NULL, `utm_term` varchar(255) NULL,
  `utm_content` varchar(255) NULL, `gclid` varchar(255) NULL,
  `gbraid` varchar(255) NULL, `wbraid` varchar(255) NULL, `fbclid` varchar(255) NULL,
  `attribution_data` text NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `deals_id` PRIMARY KEY (`id`),
  CONSTRAINT `deals_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `deals_account_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `deals_contact_fk` FOREIGN KEY (`primary_contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `deals_stage_fk` FOREIGN KEY (`stage_id`) REFERENCES `deal_stages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `deals_owner_fk` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `deals_org_status_idx` (`organization_id`,`status`)
);
--> statement-breakpoint
CREATE TABLE `attribution_touchpoints` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL, `lead_id` int NULL, `deal_id` int NULL, `contact_id` int NULL,
  `touch_type` enum('first','middle','last','conversion') NOT NULL DEFAULT 'middle',
  `occurred_at` timestamp NOT NULL,
  `source` varchar(255) NULL, `medium` varchar(255) NULL, `campaign` varchar(255) NULL,
  `content` varchar(255) NULL, `term` varchar(255) NULL,
  `click_id_type` varchar(20) NULL, `click_id` varchar(255) NULL,
  `landing_page_url` varchar(1000) NULL, `referrer_url` varchar(1000) NULL,
  `metadata` text NULL, `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `attribution_touchpoints_id` PRIMARY KEY (`id`),
  CONSTRAINT `attribution_touchpoints_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attribution_touchpoints_lead_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attribution_touchpoints_deal_fk` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attribution_touchpoints_contact_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  INDEX `attribution_touchpoints_lead_idx` (`lead_id`,`occurred_at`),
  INDEX `attribution_touchpoints_deal_idx` (`deal_id`,`occurred_at`)
);
--> statement-breakpoint
CREATE TABLE `custom_field_definitions` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL,
  `entity_type` enum('account','contact','lead','deal','project') NOT NULL,
  `field_key` varchar(100) NOT NULL, `label` varchar(120) NOT NULL,
  `field_type` enum('text','number','date','boolean','select','multi_select','url') NOT NULL,
  `options` text NULL, `is_required` int NOT NULL DEFAULT 0, `is_active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()), `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custom_field_definitions_id` PRIMARY KEY (`id`),
  CONSTRAINT `custom_field_definitions_unique` UNIQUE (`organization_id`,`entity_type`,`field_key`),
  CONSTRAINT `custom_field_definitions_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `custom_field_values` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL, `definition_id` int NOT NULL,
  `entity_type` enum('account','contact','lead','deal','project') NOT NULL, `entity_id` int NOT NULL,
  `value` text NULL, `updated_by_id` int NULL, `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custom_field_values_id` PRIMARY KEY (`id`),
  CONSTRAINT `custom_field_values_unique` UNIQUE (`definition_id`,`entity_type`,`entity_id`),
  CONSTRAINT `custom_field_values_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `custom_field_values_definition_fk` FOREIGN KEY (`definition_id`) REFERENCES `custom_field_definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `custom_field_values_user_fk` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL, `actor_user_id` int NULL,
  `action` varchar(100) NOT NULL, `entity_type` varchar(100) NOT NULL, `entity_id` varchar(100) NULL,
  `request_id` varchar(100) NULL, `ip_hash` varchar(128) NULL, `user_agent` varchar(500) NULL,
  `before_data` text NULL, `after_data` text NULL, `metadata` text NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_events_id` PRIMARY KEY (`id`),
  CONSTRAINT `audit_events_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `audit_events_actor_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `audit_events_org_created_idx` (`organization_id`,`created_at`),
  INDEX `audit_events_entity_idx` (`organization_id`,`entity_type`,`entity_id`)
);
--> statement-breakpoint
CREATE TABLE `automation_definitions` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL, `name` varchar(255) NOT NULL,
  `trigger_type` varchar(100) NOT NULL, `trigger_config` text NOT NULL, `action_config` text NOT NULL,
  `status` enum('draft','active','paused') NOT NULL DEFAULT 'draft', `created_by_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()), `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `automation_definitions_id` PRIMARY KEY (`id`),
  CONSTRAINT `automation_definitions_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_definitions_creator_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `automation_runs` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL, `automation_id` int NOT NULL,
  `event_key` varchar(255) NULL, `status` enum('queued','running','succeeded','failed','cancelled') NOT NULL DEFAULT 'queued',
  `input_data` text NULL, `output_data` text NULL, `error_message` text NULL,
  `started_at` timestamp NULL, `finished_at` timestamp NULL, `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `automation_runs_id` PRIMARY KEY (`id`),
  CONSTRAINT `automation_runs_event_unique` UNIQUE (`automation_id`,`event_key`),
  CONSTRAINT `automation_runs_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_runs_definition_fk` FOREIGN KEY (`automation_id`) REFERENCES `automation_definitions` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
  `id` int AUTO_INCREMENT NOT NULL, `user_id` int NOT NULL, `organization_id` int NULL,
  `session_id` varchar(64) NOT NULL, `token_hash` varchar(128) NOT NULL,
  `device_name` varchar(255) NULL, `user_agent` varchar(500) NULL, `ip_hash` varchar(128) NULL,
  `last_seen_at` timestamp NOT NULL DEFAULT (now()), `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL, `revoke_reason` varchar(255) NULL, `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `user_sessions_id` PRIMARY KEY (`id`), CONSTRAINT `user_sessions_session_id_unique` UNIQUE (`session_id`),
  CONSTRAINT `user_sessions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_sessions_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `mfa_factors` (
  `id` int AUTO_INCREMENT NOT NULL, `user_id` int NOT NULL,
  `type` enum('totp','webauthn','recovery') NOT NULL, `label` varchar(100) NULL,
  `secret_encrypted` text NULL, `credential_data_encrypted` text NULL,
  `verified_at` timestamp NULL, `last_used_at` timestamp NULL, `disabled_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `mfa_factors_id` PRIMARY KEY (`id`),
  CONSTRAINT `mfa_factors_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `connector_accounts` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL,
  `provider` enum('google_ads','meta_ads','ga4','search_console') NOT NULL,
  `external_account_id` varchar(255) NOT NULL, `display_name` varchar(255) NULL,
  `credentials_encrypted` text NOT NULL, `scopes` text NULL,
  `status` enum('connected','reauth_required','disabled','error') NOT NULL DEFAULT 'connected',
  `sync_cursor` text NULL, `last_synced_at` timestamp NULL, `last_error` text NULL, `created_by_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()), `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `connector_accounts_id` PRIMARY KEY (`id`),
  CONSTRAINT `connector_accounts_unique` UNIQUE (`organization_id`,`provider`,`external_account_id`),
  CONSTRAINT `connector_accounts_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connector_accounts_creator_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_event_ledger` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NULL,
  `provider` varchar(50) NOT NULL, `external_event_id` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL, `payload_hash` varchar(128) NOT NULL,
  `signature_verified` int NOT NULL DEFAULT 0,
  `status` enum('received','processing','processed','failed','ignored') NOT NULL DEFAULT 'received',
  `attempt_count` int NOT NULL DEFAULT 0, `last_error` text NULL,
  `received_at` timestamp NOT NULL DEFAULT (now()), `processed_at` timestamp NULL,
  CONSTRAINT `webhook_event_ledger_id` PRIMARY KEY (`id`),
  CONSTRAINT `webhook_event_ledger_unique` UNIQUE (`provider`,`external_event_id`),
  CONSTRAINT `webhook_event_ledger_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  INDEX `webhook_event_ledger_status_idx` (`status`,`received_at`)
);
--> statement-breakpoint
CREATE TABLE `storage_objects` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL,
  `object_key` varchar(700) NOT NULL, `bucket` varchar(255) NOT NULL, `original_name` varchar(255) NOT NULL,
  `content_type` varchar(255) NOT NULL, `size_bytes` int NOT NULL, `checksum_sha256` varchar(64) NOT NULL,
  `scan_status` enum('pending','clean','infected','failed') NOT NULL DEFAULT 'pending',
  `visibility` enum('private','organization','client') NOT NULL DEFAULT 'private',
  `entity_type` varchar(100) NULL, `entity_id` int NULL, `uploaded_by_id` int NULL,
  `deleted_at` timestamp NULL, `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `storage_objects_id` PRIMARY KEY (`id`), CONSTRAINT `storage_objects_object_key_unique` UNIQUE (`object_key`),
  CONSTRAINT `storage_objects_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `storage_objects_uploader_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `import_jobs` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL,
  `entity_type` enum('account','contact','lead','deal','project') NOT NULL, `source_object_id` int NULL,
  `status` enum('uploaded','mapping','validating','ready','processing','completed','failed','cancelled') NOT NULL DEFAULT 'uploaded',
  `mapping` text NULL, `dedupe_strategy` varchar(50) NOT NULL DEFAULT 'skip',
  `total_rows` int NOT NULL DEFAULT 0, `valid_rows` int NOT NULL DEFAULT 0, `error_rows` int NOT NULL DEFAULT 0,
  `processed_rows` int NOT NULL DEFAULT 0, `created_by_id` int NULL,
  `started_at` timestamp NULL, `finished_at` timestamp NULL, `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `import_jobs_id` PRIMARY KEY (`id`),
  CONSTRAINT `import_jobs_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `import_jobs_object_fk` FOREIGN KEY (`source_object_id`) REFERENCES `storage_objects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `import_jobs_creator_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `import_rows` (
  `id` int AUTO_INCREMENT NOT NULL, `organization_id` int NOT NULL, `import_job_id` int NOT NULL,
  `row_number` int NOT NULL, `raw_data` text NOT NULL, `normalized_data` text NULL,
  `fingerprint` varchar(128) NULL,
  `status` enum('pending','valid','invalid','duplicate','imported','failed') NOT NULL DEFAULT 'pending',
  `errors` text NULL, `target_entity_id` int NULL, `processed_at` timestamp NULL,
  CONSTRAINT `import_rows_id` PRIMARY KEY (`id`), CONSTRAINT `import_rows_job_row_unique` UNIQUE (`import_job_id`,`row_number`),
  CONSTRAINT `import_rows_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `import_rows_job_fk` FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `clients`
  ADD CONSTRAINT `clients_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `clients_account_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `projects_account_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `projects_deal_fk` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `leads`
  ADD CONSTRAINT `leads_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `leads_account_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `leads_contact_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `leads_deal_fk` FOREIGN KEY (`converted_deal_id`) REFERENCES `deals` (`id`) ON DELETE SET NULL;
