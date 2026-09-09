import { prisma } from "@/lib/prisma";

export async function addAuditLog(params: {
  entityType: string;
  entityId: string;
  userId?: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  comment?: string;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId ?? null,
      action: params.action,
      oldValue: params.oldValue as any,
      newValue: params.newValue as any,
      comment: params.comment
    }
  });
}
