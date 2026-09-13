"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";
import { assertCan } from "@/lib/rbac";
import { addAuditLog } from "@/lib/audit";
import type { Role, Section } from "@prisma/client";
import Papa from "papaparse";
import { rawRowToWasteTripInput, WASTE_TRIP_REQUIRED_HEADERS } from "@/lib/csv-import/waste-trip-mapping";
import { wasteTripInputSchema, exportActualImportInputSchema } from "@/lib/csv-import/schemas";
import { rawRowToExportActualInput, isBlankExportActualRow, EXPORT_ACTUAL_REQUIRED_HEADERS } from "@/lib/csv-import/export-actual-mapping";
import ExcelJS from "exceljs";
import { parsePlanDeliveryWorkbook, type CellWorksheet } from "@/lib/csv-import/export-plan-mapping";

// ---- Waste Type Mapping (§1) ----
export async function upsertMappingAction(input: { id?: string; typeWasteValue: string; section: Section; confirmed: boolean; note?: string }) {
  const session = await requireUser();
  assertCan(session.role, "administer");
  if (input.id) {
    await prisma.wasteTypeMapping.update({ where: { id: input.id }, data: input });
  } else {
    await prisma.wasteTypeMapping.create({ data: input });
  }
  await addAuditLog({ entityType: "WasteTypeMapping", entityId: input.id ?? input.typeWasteValue, userId: session.userId, action: "upsert", newValue: input });
  revalidatePath("/settings");
  revalidatePath("/lines");
}

export async function deleteMappingAction(id: string) {
  const session = await requireUser();
  assertCan(session.role, "administer");
  await prisma.wasteTypeMapping.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/lines");
}

// ---- Destinations (§3.1) ----
export async function upsertDestinationAction(input: { id?: string; section: Section; name: string; standingNote?: string; active: boolean }) {
  const session = await requireUser();
  assertCan(session.role, "administer");
  if (input.id) {
    await prisma.destination.update({ where: { id: input.id }, data: input });
  } else {
    await prisma.destination.create({ data: input });
  }
  revalidatePath("/settings");
  revalidatePath("/export-plan");
}

// ---- Transport companies (§3.4) ----
export async function upsertTransportCompanyAction(input: { id?: string; name: string; active: boolean }) {
  const session = await requireUser();
  assertCan(session.role, "administer");
  if (input.id) {
    await prisma.transportCompany.update({ where: { id: input.id }, data: input });
  } else {
    await prisma.transportCompany.create({ data: { name: input.name, active: input.active } });
  }
  revalidatePath("/settings");
  revalidatePath("/export-plan");
}

// ---- Users ----
export async function upsertUserAction(input: { id?: string; name: string; email: string; role: Role; active: boolean; password?: string }) {
  const session = await requireUser();
  assertCan(session.role, "administer");
  if (input.id) {
    const data: any = { name: input.name, email: input.email, role: input.role, active: input.active };
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);
    await prisma.user.update({ where: { id: input.id }, data });
  } else {
    const passwordHash = await bcrypt.hash(input.password || "Control321", 10);
    await prisma.user.create({ data: { name: input.name, email: input.email, role: input.role, active: input.active, passwordHash } });
  }
  revalidatePath("/settings");
}

// ---- CSV/Excel import (§7) — dry-run preview + explicit confirm ----
export type ImportPreviewRow = { row: number; data: Record<string, string>; errors: string[] };
export type ImportPreview = { validCount: number; errorCount: number; rows: ImportPreviewRow[] };

export async function previewWasteTripImportAction(csvText: string): Promise<ImportPreview> {
  const session = await requireUser();
  assertCan(session.role, "administer");

  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const rows: ImportPreviewRow[] = [];

  const headers = parsed.meta.fields ?? [];
  const missingHeaders = WASTE_TRIP_REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  parsed.data.forEach((raw, idx) => {
    const errors: string[] = [];
    if (missingHeaders.length > 0 && idx === 0) {
      errors.push(`ไฟล์ขาดคอลัมน์ที่จำเป็น: ${missingHeaders.join(", ")}`);
    }
    const input = rawRowToWasteTripInput(raw);
    const result = wasteTripInputSchema.safeParse(input);
    if (!result.success) {
      errors.push(...result.error.issues.map((i) => i.message));
    }
    rows.push({ row: idx + 2, data: raw, errors });
  });

  return {
    validCount: rows.filter((r) => r.errors.length === 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    rows
  };
}

export async function commitWasteTripImportAction(csvText: string) {
  const session = await requireUser();
  assertCan(session.role, "administer");

  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  let created = 0;
  for (const raw of parsed.data) {
    const input = rawRowToWasteTripInput(raw);
    const result = wasteTripInputSchema.safeParse(input);
    if (!result.success) continue; // preview step already surfaced errors; skip bad rows on commit
    const d = result.data;
    await prisma.wasteTrip.create({
      data: {
        receivedDate: new Date(d.receivedDate),
        transportDocumentNo: d.transportDocumentNo,
        customerCode: d.customerCode,
        customerName: d.customerName,
        saleOrder: d.saleOrder,
        wasteCode: d.wasteCode,
        wasteName: d.wasteName,
        saleName: d.saleName,
        saleSupport: d.saleSupport || null,
        receivedWeightTon: d.receivedWeightTon,
        transportConfirmed: d.transportConfirmed ?? false,
        treatedWeightTon: d.treatedWeightTon ?? null,
        treatedDate: d.treatedDate ? new Date(d.treatedDate) : null,
        typeWasteRaw: d.typeWasteRaw,
        offSpec: d.offSpec ?? false,
        offSpecNote: d.offSpecNote || null,
        remark: d.remark || null,
        recordedById: session.userId
      }
    });
    created++;
  }
  await addAuditLog({ entityType: "WasteTrip", entityId: "bulk-import", userId: session.userId, action: "csv-import", newValue: { created } });
  revalidatePath("/lines");
  revalidatePath("/dashboard");
  return { created };
}

// ---- Export-actual (real flat shipment log) CSV import ----
// Columns: วันที่ส่งกาก/วันที่บำบัด/Manifest No./ชื่อลูกค้า/ประเภทกาก/แผนกบำบัด/
// นน.ส่งออก(ตัน)/หมายเหตุ — see src/lib/csv-import/export-actual-mapping.ts.
// Rows land in ExportActualEntry with blockId=null (unlinked to any
// month/destination plan block) — a Head of Operation/Planner reconciles
// them against a specific block later from the export-plan calendar UI.
export type ExportActualImportPreviewRow = { row: number; data: Record<string, string>; errors: string[]; warnings: string[] };
export type ExportActualImportPreview = {
  validCount: number;
  warningCount: number;
  errorCount: number;
  skippedBlankCount: number;
  rows: ExportActualImportPreviewRow[];
};

export async function previewExportActualImportAction(csvText: string): Promise<ExportActualImportPreview> {
  await requireUser().then((s) => assertCan(s.role, "administer"));

  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const missingHeaders = EXPORT_ACTUAL_REQUIRED_HEADERS.filter((h) => !headers.includes(h));

  const rows: ExportActualImportPreviewRow[] = [];
  let skippedBlankCount = 0;

  parsed.data.forEach((raw, idx) => {
    const parsedRow = rawRowToExportActualInput(raw);
    if (isBlankExportActualRow(parsedRow)) {
      skippedBlankCount++;
      return;
    }
    const errors: string[] = [];
    if (missingHeaders.length > 0 && rows.length === 0) {
      errors.push(`ไฟล์ขาดคอลัมน์ที่จำเป็น: ${missingHeaders.join(", ")}`);
    }
    const result = exportActualImportInputSchema.safeParse(parsedRow);
    if (!result.success) errors.push(...result.error.issues.map((i) => i.message));

    rows.push({ row: idx + 2, data: raw, errors, warnings: parsedRow.qualityNotes });
  });

  return {
    validCount: rows.filter((r) => r.errors.length === 0 && r.warnings.length === 0).length,
    warningCount: rows.filter((r) => r.errors.length === 0 && r.warnings.length > 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    skippedBlankCount,
    rows
  };
}

export async function commitExportActualImportAction(csvText: string) {
  const session = await requireUser();
  assertCan(session.role, "administer");

  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  let created = 0;
  let skipped = 0;
  for (const raw of parsed.data) {
    const parsedRow = rawRowToExportActualInput(raw);
    if (isBlankExportActualRow(parsedRow)) continue;
    const result = exportActualImportInputSchema.safeParse(parsedRow);
    if (!result.success) {
      skipped++;
      continue; // preview step already surfaced the error; skip on commit rather than fail the whole batch
    }
    const d = result.data;
    const section = d.section && ["TF", "SP", "AR", "FC", "SRF"].includes(d.section) ? (d.section as Section) : null;
    await prisma.exportActualEntry.create({
      data: {
        blockId: null,
        section,
        shipmentDate: d.shipmentDate ? new Date(d.shipmentDate) : null,
        treatmentDate: d.treatmentDate ? new Date(d.treatmentDate) : null,
        manifestNo: d.manifestNo || null,
        customerName: d.customerName || null,
        wasteCategory: d.wasteCategory || null,
        weightTon: d.weightTon,
        note: d.note || null,
        recordedById: session.userId
      }
    });
    created++;
  }
  await addAuditLog({
    entityType: "ExportActualEntry",
    entityId: "bulk-import-flat",
    userId: session.userId,
    action: "csv-import",
    newValue: { created, skipped }
  });
  revalidatePath("/export-plan");
  revalidatePath("/dashboard");
  return { created, skipped };
}

// ---- Plan delivery (target-plan grid) .xlsx import ----
// Real source: "Plan delivery Haz 2026.xlsx" — see
// docs/master-prompt-operations-command-center.md §3.3 and
// src/lib/csv-import/export-plan-mapping.ts for the confirmed structure.
// This is a binary .xlsx, not a flat CSV, so the client sends it as a
// base64 string rather than plain text (see ImportTab.tsx).
export type PlanDeliveryBlockPreview = {
  sheetName: string;
  year: number;
  month: number;
  wasteCategoryRaw: string;
  section: string | null;
  destinationName: string;
  targetPlanTon: number | null;
  plannedDaysCount: number;
  actualDaysCount: number;
  actualTotalTon: number;
  standingNote: string | null;
  warnings: string[];
  willImport: boolean;
};
export type PlanDeliveryImportPreview = {
  skippedSheets: string[];
  blocks: PlanDeliveryBlockPreview[];
  importableCount: number;
  skippedCount: number;
};

async function loadPlanDeliveryWorkbookSheets(fileBase64: string): Promise<CellWorksheet[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs's bundled type defs reference a Buffer shape that doesn't
  // line up with this project's @types/node Buffer<T> generic — the
  // runtime value is a plain, valid Node Buffer either way, only the
  // type-level shape mismatches between the two packages' own type defs.
  await wb.xlsx.load(Buffer.from(fileBase64, "base64") as any);
  return wb.worksheets.map((ws) => ({
    name: ws.name,
    rowCount: ws.rowCount,
    getRow: (r: number) => ({ values: ws.getRow(r).values as unknown[] })
  }));
}

export async function previewPlanDeliveryImportAction(fileBase64: string): Promise<PlanDeliveryImportPreview> {
  await requireUser().then((s) => assertCan(s.role, "administer"));

  const sheets = await loadPlanDeliveryWorkbookSheets(fileBase64);
  const { blocks, skippedSheets } = parsePlanDeliveryWorkbook(sheets);

  const previewBlocks: PlanDeliveryBlockPreview[] = blocks.map((b) => ({
    sheetName: b.sheetName,
    year: b.year,
    month: b.month,
    wasteCategoryRaw: b.wasteCategoryRaw,
    section: b.section,
    destinationName: b.destinationName,
    targetPlanTon: b.targetPlanTon,
    plannedDaysCount: b.plannedDays.length,
    actualDaysCount: b.actualDays.length,
    actualTotalTon: b.actualDays.reduce((sum, a) => sum + a.weightTon, 0),
    standingNote: b.standingNote,
    warnings: b.warnings,
    willImport: b.section !== null && b.destinationName !== ""
  }));

  return {
    skippedSheets,
    blocks: previewBlocks,
    importableCount: previewBlocks.filter((b) => b.willImport).length,
    skippedCount: previewBlocks.filter((b) => !b.willImport).length
  };
}

export async function commitPlanDeliveryImportAction(fileBase64: string) {
  const session = await requireUser();
  assertCan(session.role, "administer");

  const sheets = await loadPlanDeliveryWorkbookSheets(fileBase64);
  const { blocks } = parsePlanDeliveryWorkbook(sheets);

  let blocksImported = 0;
  let blocksSkipped = 0;
  let actualEntriesCreated = 0;

  for (const b of blocks) {
    if (!b.section || !b.destinationName) {
      blocksSkipped++;
      continue;
    }
    const section = b.section as Section;

    const destination = await prisma.destination.upsert({
      where: { section_name: { section, name: b.destinationName } },
      update: b.standingNote ? { standingNote: b.standingNote } : {},
      create: { section, name: b.destinationName, standingNote: b.standingNote ?? undefined }
    });

    const monthRecord = await prisma.exportPlanMonth.upsert({
      where: { year_month: { year: b.year, month: b.month } },
      update: {},
      create: { year: b.year, month: b.month }
    });

    const block = await prisma.exportPlanBlock.upsert({
      where: { monthId_section_destinationId: { monthId: monthRecord.id, section, destinationId: destination.id } },
      update: {
        plannedDays: b.plannedDays,
        ...(b.targetPlanTon != null ? { targetPlanTon: b.targetPlanTon } : {})
      },
      create: {
        monthId: monthRecord.id,
        section,
        destinationId: destination.id,
        plannedDays: b.plannedDays,
        targetPlanTon: b.targetPlanTon ?? undefined
      }
    });
    blocksImported++;

    for (const a of b.actualDays) {
      const shipmentDate = new Date(Date.UTC(b.year, b.month - 1, a.day));
      const existing = await prisma.exportActualEntry.findFirst({
        where: { blockId: block.id, shipmentDate }
      });
      if (existing) continue; // idempotent re-import: never duplicate a day that already has an actual entry
      await prisma.exportActualEntry.create({
        data: {
          blockId: block.id,
          section,
          shipmentDate,
          weightTon: a.weightTon,
          recordedById: session.userId
        }
      });
      actualEntriesCreated++;
    }
  }

  await addAuditLog({
    entityType: "ExportPlanBlock",
    entityId: "bulk-import-plan-delivery",
    userId: session.userId,
    action: "xlsx-import",
    newValue: { blocksImported, blocksSkipped, actualEntriesCreated }
  });
  revalidatePath("/export-plan");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { blocksImported, blocksSkipped, actualEntriesCreated };
}
