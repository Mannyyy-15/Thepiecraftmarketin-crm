-- Tenant-scope legacy document metadata. Existing rows inherit the linked
-- client's organization, then the internal default for unlinked agency files.

ALTER TABLE `documents` ADD COLUMN `organization_id` int NULL;
--> statement-breakpoint
UPDATE `documents` d
JOIN `clients` c ON c.`id` = d.`client_id`
SET d.`organization_id` = c.`organization_id`
WHERE d.`organization_id` IS NULL;
--> statement-breakpoint
SET @default_organization_id = COALESCE(
  (SELECT `id` FROM `organizations` WHERE `slug` = 'thepiecraft' LIMIT 1),
  (SELECT `id` FROM `organizations` ORDER BY `id` LIMIT 1)
);
--> statement-breakpoint
UPDATE `documents`
SET `organization_id` = @default_organization_id
WHERE `organization_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX `documents_org_created_idx` ON `documents` (`organization_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `documents_client_created_idx` ON `documents` (`client_id`, `created_at`);
