-- Bind office/geofence locations to an organization so attendance validation
-- never falls back to another tenant's first location.

ALTER TABLE `locations` ADD COLUMN `organization_id` int NULL;
--> statement-breakpoint
SET @default_organization_id = COALESCE(
  (SELECT `id` FROM `organizations` WHERE `slug` = 'thepiecraft' LIMIT 1),
  (SELECT `id` FROM `organizations` ORDER BY `id` LIMIT 1)
);
--> statement-breakpoint
UPDATE `locations`
SET `organization_id` = @default_organization_id
WHERE `organization_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `locations`
  ADD CONSTRAINT `locations_organization_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX `locations_organization_idx` ON `locations` (`organization_id`);
