-- Preserve existing invoices while resolving any historical duplicate numbers
-- before enforcing uniqueness. The row id makes each repaired value durable.
UPDATE `invoices` i
JOIN (
  SELECT `invoice_number`
  FROM `invoices`
  GROUP BY `invoice_number`
  HAVING COUNT(*) > 1
) duplicate_numbers ON duplicate_numbers.`invoice_number` = i.`invoice_number`
SET i.`invoice_number` = CONCAT(LEFT(i.`invoice_number`, 38), '-', i.`id`);
--> statement-breakpoint
ALTER TABLE `invoices`
ADD CONSTRAINT `invoices_invoice_number_unique` UNIQUE(`invoice_number`);
