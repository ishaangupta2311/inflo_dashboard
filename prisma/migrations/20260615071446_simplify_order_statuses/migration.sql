-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'In Progress';

-- Collapse legacy statuses: anything that wasn't finished becomes "In Progress".
-- (Old values were "Brief received" / "In outreach" / "Content review" / "Publishing".)
UPDATE "orders" SET "status" = 'In Progress' WHERE "status" <> 'Completed';
