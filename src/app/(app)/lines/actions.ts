"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";
import { assertCan } from "@/lib/rbac";
import { addAuditLog } from "@/lib/audit";
import { wasteTripInputSchema } from "@/lib/csv-import/schemas";

export type ActionState = { error?: string; ok?: boolean } | undefined;

export async function createWasteTripAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  assertCan(session.role, "createTrip");

  const parsed = wasteTripInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const d = parsed.data;

  const created = await prisma.wasteTrip.create({
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

  await addAuditLog({ entityType: "WasteTrip", entityId: created.id, userId: session.userId, action: "create", newValue: d });
  revalidatePath("/lines");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateWasteTripAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();
  assertCan(session.role, "editTrip");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ไม่พบรายการ" };

  const parsed = wasteTripInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const d = parsed.data;

  const before = await prisma.wasteTrip.findUnique({ where: { id } });
  const updated = await prisma.wasteTrip.update({
    where: { id },
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
      remark: d.remark || null
    }
  });

  await addAuditLog({ entityType: "WasteTrip", entityId: id, userId: session.userId, action: "update", oldValue: before, newValue: updated });
  revalidatePath("/lines");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Inline-edit path for the 3 fields that change post-receipt in the normal
 * daily workflow (see plan doc §4a). Deliberately narrow — everything else
 * goes through the full modal + updateWasteTripAction above. */
export async function quickUpdateWasteTripAction(input: {
  id: string;
  transportConfirmed?: boolean;
  treatedWeightTon?: number | null;
  treatedDate?: string | null;
}) {
  const session = await requireUser();
  assertCan(session.role, "editTrip");

  const before = await prisma.wasteTrip.findUnique({ where: { id: input.id } });
  if (!before) throw new Error("ไม่พบรายการ");

  const updated = await prisma.wasteTrip.update({
    where: { id: input.id },
    data: {
      ...(input.transportConfirmed !== undefined ? { transportConfirmed: input.transportConfirmed } : {}),
      ...(input.treatedWeightTon !== undefined ? { treatedWeightTon: input.treatedWeightTon } : {}),
      ...(input.treatedDate !== undefined ? { treatedDate: input.treatedDate ? new Date(input.treatedDate) : null } : {})
    }
  });

  await addAuditLog({
    entityType: "WasteTrip",
    entityId: input.id,
    userId: session.userId,
    action: "quick-update",
    oldValue: before,
    newValue: updated
  });
  revalidatePath("/lines");
  revalidatePath("/dashboard");
  return { ok: true };
}
