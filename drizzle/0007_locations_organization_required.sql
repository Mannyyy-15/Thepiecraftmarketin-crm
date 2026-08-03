-- Repair office rows created after the tenant migration and prevent future
-- unscoped geofence locations.

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
  MODIFY COLUMN `organization_id` int NOT NULL;
