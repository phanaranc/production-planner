import { prisma } from "@/lib/prisma";
import type { Section } from "@prisma/client";

export type WhatIfInput = {
  section: Section;
  stoppageDays: number;
  windowDays: 7 | 14 | 30 | 90;
  year: number;
  month: number;
};

export type WhatIfResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      avgDailyTon: number;
      windowDays: number;
      estimatedLossTon: number;
      targetPlanTon: number;
      actualSoFarTon: number;
      currentPct: number;
      projectedPct: number;
      deltaPct: number;
    };

// §4.4 — rule-based, fully traceable (every intermediate number is returned,
// not just the final delta). Deliberately does NOT try to project how the
// rest of the month "would have" shipped absent the stoppage — that would
// stack a second, more speculative assumption on top of an already-estimated
// average, which conflicts with "rule-based, not a black box."
export async function runWhatIfScenario(input: WhatIfInput): Promise<WhatIfResult> {
  const { section, stoppageDays, windowDays, year, month } = input;
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);

  const windowAgg = await prisma.exportActualEntry.aggregate({
    _sum: { weightTon: true },
    where: {
      block: { section },
      shipmentDate: { gte: windowStart, lte: now }
    }
  });
  const windowTotalTon = Number(windowAgg._sum.weightTon ?? 0);
  if (windowTotalTon <= 0) {
    return { ok: false, reason: `ไม่มีข้อมูลน้ำหนักส่งออกจริงของสาย ${section} ในช่วง ${windowDays} วันที่ผ่านมา — ไม่สามารถประเมินได้` };
  }
  const avgDailyTon = windowTotalTon / windowDays;
  const estimatedLossTon = avgDailyTon * stoppageDays;

  const monthRecord = await prisma.exportPlanMonth.findUnique({ where: { year_month: { year, month } } });
  if (!monthRecord) {
    return { ok: false, reason: `ยังไม่มีแผนส่งออกของเดือน ${month}/${year} ในระบบ` };
  }
  const blocks = await prisma.exportPlanBlock.findMany({
    where: { monthId: monthRecord.id, section },
    include: { actualEntries: true }
  });
  const targetPlanTon = blocks.reduce((sum, b) => sum + Number(b.targetPlanTon ?? 0), 0);
  if (targetPlanTon <= 0) {
    return { ok: false, reason: `ยังไม่ได้ตั้ง Target plan สำหรับสาย ${section} เดือน ${month}/${year}` };
  }
  const actualSoFarTon = blocks.reduce(
    (sum, b) => sum + b.actualEntries.reduce((s, e) => s + Number(e.weightTon ?? 0), 0),
    0
  );

  const currentPct = (actualSoFarTon / targetPlanTon) * 100;
  const projectedPct = ((actualSoFarTon - estimatedLossTon) / targetPlanTon) * 100;

  return {
    ok: true,
    avgDailyTon,
    windowDays,
    estimatedLossTon,
    targetPlanTon,
    actualSoFarTon,
    currentPct,
    projectedPct,
    deltaPct: projectedPct - currentPct
  };
}
