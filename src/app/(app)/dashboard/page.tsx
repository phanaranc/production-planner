import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/ui/KpiCard";
import { getMonthSummary, getBlocksForMonth, getOrCreateMonth } from "@/lib/export-plan-data";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default async function DashboardPage() {
  const today = startOfToday();
  const monthStart = startOfMonth();
  const monthEnd = startOfNextMonth();
  const now = new Date();

  const [tripsToday, tripsThisMonth, monthAgg, offSpecCount, awaitingTreatmentCount, totalThisMonthCount] =
    await Promise.all([
      prisma.wasteTrip.count({ where: { receivedDate: { gte: today } } }),
      prisma.wasteTrip.count({ where: { receivedDate: { gte: monthStart, lt: monthEnd } } }),
      prisma.wasteTrip.aggregate({
        where: { receivedDate: { gte: monthStart, lt: monthEnd } },
        _sum: { receivedWeightTon: true, treatedWeightTon: true }
      }),
      prisma.wasteTrip.count({ where: { offSpec: true, receivedDate: { gte: monthStart, lt: monthEnd } } }),
      prisma.wasteTrip.count({
        where: {
          receivedDate: { gte: monthStart, lt: monthEnd },
          OR: [{ transportConfirmed: false }, { AND: [{ transportConfirmed: true }, { treatedDate: null }] }]
        }
      }),
      prisma.wasteTrip.count({ where: { receivedDate: { gte: monthStart, lt: monthEnd } } })
    ]);

  const monthRecord = await getOrCreateMonth(now.getFullYear(), now.getMonth() + 1);
  const blocks = await getBlocksForMonth(monthRecord.id);
  const summary = await getMonthSummary(now.getFullYear(), now.getMonth() + 1, blocks);

  const pendingPct = totalThisMonthCount > 0 ? (awaitingTreatmentCount / totalThisMonthCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          วันนี้ {today.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon="🚚" label="เที่ยวรับของเสียวันนี้" value={String(tripsToday)} tone="info" />
        <KpiCard icon="📋" label="เที่ยวรับของเสียเดือนนี้" value={String(tripsThisMonth)} tone="info" />
        <KpiCard
          icon="⚖️"
          label="น้ำหนักรับเข้ารวม (ตัน)"
          value={Number(monthAgg._sum.receivedWeightTon ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 1 })}
          tone="info"
        />
        <KpiCard
          icon="✅"
          label="น้ำหนักบำบัดรวม (ตัน)"
          value={Number(monthAgg._sum.treatedWeightTon ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 1 })}
          tone="good"
        />
        <KpiCard
          icon="⏳"
          label={'% เที่ยวที่ยัง "รอบำบัด"'}
          value={`${pendingPct.toFixed(1)}%`}
          sub={`${awaitingTreatmentCount} / ${totalThisMonthCount} เที่ยว`}
          tone="warn"
        />
        <KpiCard icon="⚠️" label="รายการ OFF SPEC (เดือนนี้)" value={String(offSpecCount)} tone="risk" />
        <KpiCard
          icon="📦"
          label="% ความสำเร็จแผนส่งออกเดือนนี้"
          value={summary.achievementPct != null ? `${summary.achievementPct.toFixed(1)}%` : "—"}
          sub={
            summary.targetPlanTotalTon > 0
              ? `${summary.actualTotalTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} / ${summary.targetPlanTotalTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตัน`
              : "ยังไม่ได้ตั้ง Target plan"
          }
          tone="good"
        />
        <KpiCard
          icon="🔥"
          label="% การส่งเผา (ส่งออก/รับเข้า)"
          value={summary.incinerationPct != null ? `${summary.incinerationPct.toFixed(1)}%` : "—"}
          tone="info"
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-navy-900 mb-2">หมายเหตุ</h2>
        <p className="text-sm text-gray-500">
          ตัวเลขทั้งหมดคำนวณสดจากฐานข้อมูล ไม่มีค่า Hard-code — ระบบเป็นเครื่องมือ &quot;แนะนำ&quot; เท่านั้น การอนุมัติแผนขั้นสุดท้ายเป็นของ Planner / Head of
          Operation เสมอ
        </p>
      </div>
    </div>
  );
}
