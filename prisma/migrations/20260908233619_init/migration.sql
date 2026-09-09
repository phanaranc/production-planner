-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLANNER', 'HEAD_OF_OPERATION', 'DATA_ENTRY', 'VIEWER');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('TF', 'SP', 'AR', 'FC', 'SRF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteTypeMapping" (
    "id" TEXT NOT NULL,
    "typeWasteValue" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteTypeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteTrip" (
    "id" TEXT NOT NULL,
    "receivedDate" DATE NOT NULL,
    "transportDocumentNo" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "saleOrder" TEXT NOT NULL,
    "wasteCode" TEXT NOT NULL,
    "wasteName" TEXT NOT NULL,
    "saleName" TEXT NOT NULL,
    "saleSupport" TEXT,
    "receivedWeightTon" DECIMAL(12,3) NOT NULL,
    "transportConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "treatedWeightTon" DECIMAL(12,3),
    "treatedDate" DATE,
    "typeWasteRaw" TEXT NOT NULL,
    "offSpec" BOOLEAN NOT NULL DEFAULT false,
    "offSpecNote" TEXT,
    "remark" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "name" TEXT NOT NULL,
    "standingNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TransportCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportPlanMonth" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "preparedByUserId" TEXT,
    "preparedByName" TEXT,
    "preparedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "receivedByName" TEXT,
    "receivedAt" TIMESTAMP(3),
    "trackedByUserId" TEXT,
    "trackedByName" TEXT,
    "trackedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportPlanMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportPlanBlock" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "destinationId" TEXT NOT NULL,
    "targetPlanTon" DECIMAL(12,3),
    "plannedDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportPlanBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportActualEntry" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "shipmentDate" DATE NOT NULL,
    "weightTon" DECIMAL(12,3),
    "transportCompanyId" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportActualEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WasteTypeMapping_typeWasteValue_key" ON "WasteTypeMapping"("typeWasteValue");

-- CreateIndex
CREATE INDEX "WasteTypeMapping_section_idx" ON "WasteTypeMapping"("section");

-- CreateIndex
CREATE INDEX "WasteTrip_receivedDate_idx" ON "WasteTrip"("receivedDate");

-- CreateIndex
CREATE INDEX "WasteTrip_typeWasteRaw_idx" ON "WasteTrip"("typeWasteRaw");

-- CreateIndex
CREATE INDEX "WasteTrip_customerCode_idx" ON "WasteTrip"("customerCode");

-- CreateIndex
CREATE INDEX "WasteTrip_treatedDate_idx" ON "WasteTrip"("treatedDate");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_section_name_key" ON "Destination"("section", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TransportCompany_name_key" ON "TransportCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExportPlanMonth_year_month_key" ON "ExportPlanMonth"("year", "month");

-- CreateIndex
CREATE INDEX "ExportPlanBlock_section_idx" ON "ExportPlanBlock"("section");

-- CreateIndex
CREATE UNIQUE INDEX "ExportPlanBlock_monthId_section_destinationId_key" ON "ExportPlanBlock"("monthId", "section", "destinationId");

-- CreateIndex
CREATE INDEX "ExportActualEntry_blockId_shipmentDate_idx" ON "ExportActualEntry"("blockId", "shipmentDate");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WasteTrip" ADD CONSTRAINT "WasteTrip_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPlanMonth" ADD CONSTRAINT "ExportPlanMonth_preparedByUserId_fkey" FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPlanMonth" ADD CONSTRAINT "ExportPlanMonth_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPlanMonth" ADD CONSTRAINT "ExportPlanMonth_trackedByUserId_fkey" FOREIGN KEY ("trackedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPlanBlock" ADD CONSTRAINT "ExportPlanBlock_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "ExportPlanMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportPlanBlock" ADD CONSTRAINT "ExportPlanBlock_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportActualEntry" ADD CONSTRAINT "ExportActualEntry_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ExportPlanBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportActualEntry" ADD CONSTRAINT "ExportActualEntry_transportCompanyId_fkey" FOREIGN KEY ("transportCompanyId") REFERENCES "TransportCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportActualEntry" ADD CONSTRAINT "ExportActualEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
