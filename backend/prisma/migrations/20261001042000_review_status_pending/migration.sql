-- Buyer reviews enter a moderation queue instead of being auto-approved.
-- Reviews must stay hidden until an admin approves them (B-REV-002,
-- DB spec v2.5: is_approved default flipped to FALSE).
ALTER TABLE "reviews" ALTER COLUMN "status" SET DEFAULT 'pending';
