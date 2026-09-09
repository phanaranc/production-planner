"use client";

import { useState } from "react";
import type { Section } from "@prisma/client";
import { SECTION_ORDER, SECTION_LABELS_TH, MONTH_LABELS_TH } from "@/lib/constants";
import { runWhatIfAction } from "@/app/(app)/what-if/actions";
import type { WhatIfResult } from "@/lib/what-if";

export function WhatIfForm() {
  const now = new Date();
  const [section, setSection] = useState<Section>("TF");
  const [stoppageDays, setStoppageDays] = useState(3);
  const [windowDays, setWindowDays] = useState<7 | 14 | 30 | 90>(30);
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await runWhatIfAction({ section, stoppageDays, windowDays, year, month });
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-bold text-navy-900 mb-3">ตั้งค่าสถานการณ์สมมติ</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="label">สาย</label>
            <select className="input w-full" value={section} onChange={(e) => setSection(e.target.value as Section)}>
              {SECTION_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s} — {SECTION_LABELS_TH[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">หยุดรับกี่วัน</label>
            <input
              type="number"
              min={1}
              className="input w-full"
              value={stoppageDays}
              onChange={(e) => setStoppageDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="label">คำนวณค่าเฉลี่ยจากช่วง (วัน)</label>
            <select className="input w-full" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value) as 7 | 14 | 30 | 90)}>
              <option value={7}>7 วัน</option>
              <option value={14}>14 วัน</option>
              <option value={30}>30 วัน</option>
              <option value={90}>90 วัน</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">เดือนที่ประเมินผลกระทบ</label>
            <input className="input w-full" disabled value={`${MONTH_LABELS_TH[month - 1]} ${year}`} />
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={run} disabled={loading}>
          {loading ? "กำลังคำนวณ..." : "คำนวณผลกระทบ"}
        </button>
      </div>

      {result && !result.ok && (
        <div className="card bg-amber-50 text-amber-800 text-sm">{result.reason}</div>
      )}

      {result && result.ok && (
        <div className="card space-y-3">
          <h3 className="font-bold text-navy-900">ผลการประเมิน (Rule-based — ไม่ใช่ AI Optimize)</h3>
          <p className="text-sm text-gray-500">ตัวเลขทุกตัวคำนวณจากข้อมูลจริงในฐานข้อมูล แสดงทุกขั้นตอนเพื่อให้ตรวจสอบได้</p>
          <table className="w-full text-sm">
            <tbody>
              <Row label={`น้ำหนักส่งออกเฉลี่ยต่อวัน (จาก ${result.windowDays} วันล่าสุด)`} value={`${result.avgDailyTon.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ตัน/วัน`} />
              <Row label={`ผลกระทบโดยประมาณจากการหยุดรับ ${stoppageDays} วัน`} value={`${result.estimatedLossTon.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ตัน`} />
              <Row label="Target plan เดือนนี้ (สายนี้)" value={`${result.targetPlanTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตัน`} />
              <Row label="ส่งออกจริงสะสมเดือนนี้" value={`${result.actualSoFarTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตัน`} />
              <Row label="% ความสำเร็จปัจจุบัน" value={`${result.currentPct.toFixed(1)}%`} />
              <Row label="% ความสำเร็จที่คาดการณ์หากหยุดรับจริง" value={`${result.projectedPct.toFixed(1)}%`} />
              <Row label="ผลต่าง" value={`${result.deltaPct.toFixed(1)} จุด`} highlight />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr className="border-b">
      <td className="py-2 text-gray-600">{label}</td>
      <td className={`py-2 text-right font-semibold ${highlight ? "text-status-urgent" : "text-navy-900"}`}>{value}</td>
    </tr>
  );
}
