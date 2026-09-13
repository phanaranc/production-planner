-- DropForeignKey
ALTER TABLE "ExportActualEntry" DROP CONSTRAINT "ExportActualEntry_blockId_fkey";

-- AlterTable
ALTER TABLE "ExportActualEntry" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "manifestNo" TEXT,
ADD COLUMN     "section" "Section",
ADD COLUMN     "treatmentDate" DATE,
ADD COLUMN     "wasteCategory" TEXT,
ALTER COLUMN "blockId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ExportActualEntry_manifestNo_idx" ON "ExportActualEntry"("manifestNo");

-- CreateIndex
CREATE INDEX "ExportActualEntry_section_shipmentDate_idx" ON "ExportActualEntry"("section", "shipmentDate");

-- AddForeignKey
ALTER TABLE "ExportActualEntry" ADD CONSTRAINT "ExportActualEntry_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ExportPlanBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
