"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";
import { assertCan } from "@/lib/rbac";
import { addAuditLog } from "@/lib/audit";

export async function togglePlanDayAction(blockId: string, day: number) {
  const session = await requireUser();
  assertCan(session.role, "editExportPlan");

  const block = await prisma.exportPlanBlock.findUniqueOrThrow({ where: { id: blockId } });
  const has = block.plannedDays.includes(day);
  const plannedDays = has ? block.plannedDays.filter((d) => d !== day) : [...block.plannedDays, day].sort((a, b) => a - b);

  await prisma.exportPlanBlock.update({ where: { id: blockId }, data: { plannedDays } });
  await addAuditLog({
    entityType: "ExportPlanBlock",
    entityId: blockId,
    userId: session.userId,
    action: has ? "unplan-day" : "plan-day",
    newValue: { day }
  });
  revalidatePath("/export-plan");
}

export async function setTargetPlanAction(blockId: string, targetPlanTon: number | null) {
  const session = await requireUser();
  assertCan(session.role, "editExportPlan");
  await prisma.exportPlanBlock.update({ where: { id: blockId }, data: { targetPlanTon } });
  await addAuditLog({ entityType: "ExportPlanBlock", entityId: blockId, userId: session.userId, action: "set-target", newValue: { targetPlanTon } });
  revalidatePath("/export-plan");
}

export async function setBlockRemarkAction(blockId: string, remark: string) {
  const session = await requireUser();
  assertCan(session.role, "editExportPlan");
  await prisma.exportPlanBlock.update({ where: { id: blockId }, data: { remark } });
  revalidatePath("/export-plan");
}

export async function upsertActualEntryAction(input: {
  id?: string;
  blockId: string;
  shipmentDate: string;
  weightTon: number | null;
  transportCompanyId: string | null;
  note?: string | null;
}) {
  const session = await requireUser();
  assertCan(session.role, "editExportPlan");

  if (input.id) {
    const before = await prisma.exportActualEntry.findUnique({ where: { id: input.id } });
    const updated = await prisma.exportActualEntry.update({
      where: { id: input.id },
      data: {
        shipmentDate: new Date(input.shipmentDate),
        weightTon: input.weightTon,
        transportCompanyId: input.transportCompanyId,
        note: input.note ?? null
      }
    });
    await addAuditLog({ entityType: "ExportActualEntry", entityId: input.id, userId: session.userId, action: "update", oldValue: before, newValue: updated });
  } else {
    const created = await prisma.exportActualEntry.create({
      data: {
        blockId: input.blockId,
        shipmentDate: new Date(input.shipmentDate),
        weightTon: input.weightTon,
        transportCompanyId: input.transportCompanyId,
        note: input.note ?? null,
        recordedById: session.userId
      }
    });
    await addAuditLog({ entityType: "ExportActualEntry", entityId: created.id, userId: session.userId, action: "create", newValue: created });
  }
  revalidatePath("/export-plan");
  revalidatePath("/dashboard");
}

export async function deleteActualEntryAction(id: string) {
  const session = await requireUser();
  assertCan(session.role, "editExportPlan");
  const before = await prisma.exportActualEntry.findUnique({ where: { id } });
  await prisma.exportActualEntry.delete({ where: { id } });
  await addAuditLog({ entityType: "ExportActualEntry", entityId: id, userId: session.userId, action: "delete", oldValue: before });
  revalidatePath("/export-plan");
  revalidatePath("/dashboard");
}

export async function saveSignOffAction(input: {
  monthId: string;
  role: "prepared" | "received" | "tracked";
  name: string;
}) {
  const session = await requireUser();
  assertCan(session.role, "signOff");

  const now = new Date();
  const data =
    input.role === "prepared"
      ? { preparedByUserId: session.userId, preparedByName: input.name, preparedAt: now }
      : input.role === "received"
      ? { receivedByUserId: session.userId, receivedByName: input.name, receivedAt: now }
      : { trackedByUserId: session.userId, trackedByName: input.name, trackedAt: now };

  await prisma.exportPlanMonth.update({ where: { id: input.monthId }, data });
  await addAuditLog({ entityType: "ExportPlanMonth", entityId: input.monthId, userId: session.userId, action: `sign-off-${input.role}` });
  revalidatePath("/export-plan");
}

export async function createBlockAction(input: { monthId: string; section: string; destinationId: string }) {
  const session = await requireUser();
  assertCan(session.role, "editExportPlan");
  await prisma.exportPlanBlock.create({
    data: { monthId: input.monthId, section: input.section as any, destinationId: input.destinationId }
  });
  revalidatePath("/export-plan");
}
