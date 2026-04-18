-- Add PIN hash to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pin_hash" TEXT;

-- Add pin_verified to audit_logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "pin_verified" BOOLEAN NOT NULL DEFAULT false;
