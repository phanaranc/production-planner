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
import { wasteTripInputSchema } from "@/lib/csv-import/schemas";

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
