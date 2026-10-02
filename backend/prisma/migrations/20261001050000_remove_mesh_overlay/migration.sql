-- The facial mesh overlay feature was removed from the analysis result UI,
-- so the persisted mesh URL column is no longer needed.
ALTER TABLE "skin_analysis" DROP COLUMN "mesh_overlay_url";
