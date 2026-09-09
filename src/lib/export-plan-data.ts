import { prisma } from "@/lib/prisma";
import type { Section } from "@prisma/client";
import type { DayCellState } from "@/lib/constants";

export type ActualEntryClient = {
  id: string;
  shipmentDate: string; // yyyy-mm-dd
  weightTon: number | null;
  transportCompanyId: string | null;
  transportCompanyName: string | null;
  note: string | null;
};

export type BlockClient = {
  id: string;
  section: Section;
  destinationId: string;
  destinationName: string;
  standingNote: string | null;
  targetPlanTon: number | null;
  plannedDays: number[];
  remark: string | null;
  actualEntries: ActualEntryClient[];
  totalActualTon: number;
  achievementPct: number | null;
};

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** §5 calendar legend, pure function of stored facts only — no invented state. */
export function dayCellState(
  day: number,
  plannedDays: number[],
  actualEntriesForDay: ActualEntryClient[],
  today: Date
): DayCellState {
  const isPlanned = plannedDays.includes(day);
  const hasActual = actualEntriesForDay.length > 0;
  const cellDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const thisDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), day);
  const isPast = thisDate < cellDate;

  if (isPlanned && hasActual) return "matched";
  if (isPlanned && !hasActual && !isPast) return "pending";
  if (isPlanned && !hasActual && isPast) return "missed";
  if (!isPlanned && hasActual) return "unplanned";
  return "none";
}

export async function getOrCreateMonth(year: number, month: number) {
  const existing = await prisma.exportPlanMonth.findUnique({ where: { year_month: { year, month } } });
  if (existing) return existing;
  return prisma.exportPlanMonth.create({ data: { year, month } });
}

export async function getBlocksForMonth(monthId: string): Promise<BlockClient[]> {
  const blocks = await prisma.exportPlanBlock.findMany({
    where: { monthId },
    include: {
      destination: true,
      actualEntries: { include: { transportCompany: true }, orderBy: { shipmentDate: "asc" } }
    },
    orderBy: [{ section: "asc" }, { destination: { name: "asc" } }]
  });

  return blocks.map((b) => {
    const actualEntries: ActualEntryClient[] = b.actualEntries.map((e) => ({
      id: e.id,
      shipmentDate: e.shipmentDate.toISOString().slice(0, 10),
      weightTon: e.weightTon != null ? Number(e.weightTon) : null,
      transportCompanyId: e.transportCompanyId,
      transportCompanyName: e.transportCompany?.name ?? null,
      note: e.note
    }));
    const totalActualTon = actualEntries.reduce((sum, e) => sum + (e.weightTon ?? 0), 0);
    const targetPlanTon = b.targetPlanTon != null ? Number(b.targetPlanTon) : null;
    const achievementPct = targetPlanTon && targetPlanTon > 0 ? (totalActualTon / targetPlanTon) * 100 : null;

    return {
      id: b.id,
      section: b.section,
      destinationId: b.destinationId,
      destinationName: b.destination.name,
      standingNote: b.destination.standingNote,
      targetPlanTon,
      plannedDays: b.plannedDays,
      remark: b.remark,
      actualEntries,
      totalActualTon,
      achievementPct
    };
  });
}

export type MonthSummary = {
  targetPlanTotalTon: number;
  actualTotalTon: number;
  achievementPct: number | null;
  receivedWeightTotalTon: number;
  incinerationPct: number | null; // §3.3 "เปอร์เซนต์การส่งเผา" = ส่งเผา / น้ำหนักเข้า * 100
  byTransportCompany: { name: string; totalTon: number }[];
};

export async function getMonthSummary(year: number, month: number, blocks: BlockClient[]): Promise<MonthSummary> {
  const targetPlanTotalTon = blocks.reduce((sum, b) => sum + (b.targetPlanTon ?? 0), 0);
  const actualTotalTon = blocks.reduce((sum, b) => sum + b.totalActualTon, 0);
  const achievementPct = targetPlanTotalTon > 0 ? (actualTotalTon / targetPlanTotalTon) * 100 : null;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const receivedAgg = await prisma.wasteTrip.aggregate({
    _sum: { receivedWeightTon: true },
    where: { receivedDate: { gte: start, lt: end } }
  });
  const receivedWeightTotalTon = Number(receivedAgg._sum.receivedWeightTon ?? 0);
  const incinerationPct = receivedWeightTotalTon > 0 ? (actualTotalTon / receivedWeightTotalTon) * 100 : null;

  const byCompanyMap = new Map<string, number>();
  for (const b of blocks) {
    for (const e of b.actualEntries) {
      const name = e.transportCompanyName ?? "(ไม่ระบุบริษัทขนส่ง)";
      byCompanyMap.set(name, (byCompanyMap.get(name) ?? 0) + (e.weightTon ?? 0));
    }
  }
  const byTransportCompany = Array.from(byCompanyMap.entries())
    .map(([name, totalTon]) => ({ name, totalTon }))
    .sort((a, b) => b.totalTon - a.totalTon);

  return { targetPlanTotalTon, actualTotalTon, achievementPct, receivedWeightTotalTon, incinerationPct, byTransportCompany };
}
