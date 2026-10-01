-- AlterTable
ALTER TABLE "skin_analyses" ADD COLUMN     "analysis_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "confidence" INTEGER,
ADD COLUMN     "health_score" INTEGER,
ADD COLUMN     "hydration" INTEGER,
ADD COLUMN     "mesh_overlay_url" TEXT,
ADD COLUMN     "overall_assessment" TEXT;

-- AlterTable
ALTER TABLE "skin_analysis_conditions" ADD COLUMN     "affected_area" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "severity_score" INTEGER;

-- AlterTable
ALTER TABLE "skin_analysis_recommendations" ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "product_name" TEXT,
ADD COLUMN     "product_type" TEXT;

-- CreateTable
CREATE TABLE "skin_analysis_findings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysis_id" UUID NOT NULL,
    "finding_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affected_area" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skin_analysis_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skin_analysis_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recommendation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_helpful" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skin_analysis_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skin_analysis_findings_analysis_id_idx" ON "skin_analysis_findings"("analysis_id");

-- CreateIndex
CREATE INDEX "skin_analysis_feedback_user_id_idx" ON "skin_analysis_feedback"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "skin_analysis_feedback_recommendation_id_user_id_key" ON "skin_analysis_feedback"("recommendation_id", "user_id");

-- CreateIndex
CREATE INDEX "skin_analyses_user_id_analysis_date_idx" ON "skin_analyses"("user_id", "analysis_date");

-- CreateIndex
CREATE UNIQUE INDEX "skin_analysis_conditions_analysis_id_condition_name_key" ON "skin_analysis_conditions"("analysis_id", "condition_name");

-- AddForeignKey
ALTER TABLE "skin_analysis_findings" ADD CONSTRAINT "skin_analysis_findings_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "skin_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skin_analysis_feedback" ADD CONSTRAINT "skin_analysis_feedback_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "skin_analysis_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skin_analysis_feedback" ADD CONSTRAINT "skin_analysis_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

