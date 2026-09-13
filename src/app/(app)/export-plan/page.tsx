import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";
import { can } from "@/lib/rbac";
import { getOrCreateMonth, getBlocksForMonth, getMonthSummary, getUnlinkedActualEntries } from "@/lib/export-plan-data";
import { MONTH_LABELS_TH } from "@/lib/constants";
import { ExportPlanCalendar } from "@/components/export-plan/ExportPlanCalendar";
import { MonthSummaryPanel } from "@/components/export-plan/MonthSummaryPanel";
import { SignOffForm } from "@/components/export-plan/SignOffForm";
import { UnlinkedActualEntriesPanel } from "@/components/export-plan/UnlinkedActualEntriesPanel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExportPlanPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1), 10);

  const session = await requireUser();
  const monthRecord = await getOrCreateMonth(year, month);

  // Auto-create a block for every active destination that doesn't have one
  // yet this month, so the calendar is never a dead end (plan doc §4b).
  const destinations = await prisma.destination.findMany({ where: { active: true } });
  const existingBlocks = await prisma.exportPlanBlock.findMany({ where: { monthId: monthRecord.id } });
  const existingKeys = new Set(existingBlocks.map((b) => `${b.section}:${b.destinationId}`));
  const missing = destinations.filter((d) => !existingKeys.has(`${d.section}:${d.id}`));
  if (missing.length > 0) {
    await prisma.exportPlanBlock.createMany({
      data: missing.map((d) => ({ monthId: monthRecord.id, section: d.section, destinationId: d.id })),
      skipDuplicates: true
    });
  }

  const [blocks, companies] = await Promise.all([
    getBlocksForMonth(monthRecord.id),
    prisma.transportCompany.findMany({ where: { active: true } })
  ]);
  const summary = await getMonthSummary(year, month, blocks);
  const unlinkedActualEntries = await getUnlinkedActualEntries(year, month);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">แผนส่งออกรายเดือน</h1>
          <p className="text-sm text-gray-500">ปฏิทินแผน vs จริง รายวันต่อสาย — คลิกวันที่เพื่อดู/แก้ไข</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="btn-secondary" href={`/export-plan?year=${prevMonth.year}&month=${prevMonth.month}`}>
            ← เดือนก่อน
          </Link>
          <span className="font-semibold text-navy-900 px-2">
            {MONTH_LABELS_TH[month - 1]} {year}
          </span>
          <Link className="btn-secondary" href={`/export-plan?year=${nextMonth.year}&month=${nextMonth.month}`}>
            เดือนถัดไป →
          </Link>
          <a className="btn-secondary" href={`/api/export-plan/excel?year=${year}&month=${month}`}>
            ดาวน์โหลด Excel
          </a>
          <a className="btn-secondary" href={`/api/export-plan/pdf?year=${year}&month=${month}`}>
            ดาวน์โหลด PDF
          </a>
        </div>
      </div>

      <ExportPlanCalendar
        year={year}
        month={month}
        blocks={blocks}
        companies={companies}
        canEdit={can(session.role, "editExportPlan")}
      />

      <MonthSummaryPanel summary={summary} />

      <UnlinkedActualEntriesPanel entries={unlinkedActualEntries} blocks={blocks} canEdit={can(session.role, "editExportPlan")} />

      <SignOffForm monthId={monthRecord.id} monthRecord={monthRecord} canSignOff={can(session.role, "signOff")} />
    </div>
  );
}
