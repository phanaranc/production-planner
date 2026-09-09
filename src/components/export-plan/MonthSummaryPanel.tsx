import type { MonthSummary } from "@/lib/export-plan-data";

export function MonthSummaryPanel({ summary }: { summary: MonthSummary }) {
  return (
    <div className="card">
      <h3 className="font-bold text-navy-900 mb-3">สรุปภาพรวมทั้งเดือน</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
        <Stat label="Target plan รวม (ตัน)" value={summary.targetPlanTotalTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} />
        <Stat label="Actual รวม (ตัน)" value={summary.actualTotalTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} />
        <Stat label="% ความสำเร็จ" value={summary.achievementPct != null ? `${summary.achievementPct.toFixed(1)}%` : "—"} />
        <Stat label="% การส่งเผา (ส่งออก/รับเข้า)" value={summary.incinerationPct != null ? `${summary.incinerationPct.toFixed(1)}%` : "—"} />
      </div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Workload ต่อบริษัทขนส่ง</h4>
      <div className="space-y-1">
        {summary.byTransportCompany.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีข้อมูล</p>}
        {summary.byTransportCompany.map((c) => (
          <div key={c.name} className="flex justify-between text-sm border-b py-1">
            <span>{c.name}</span>
            <span className="font-medium">{c.totalTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตัน</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-navy-900">{value}</div>
      <div className="text-gray-500">{label}</div>
    </div>
  );
}
