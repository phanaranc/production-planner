"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Section, WasteTypeMapping } from "@prisma/client";
import { SECTION_ORDER, SECTION_LABELS_TH } from "@/lib/constants";
import { upsertMappingAction, deleteMappingAction } from "@/app/(app)/settings/actions";

export function MappingTab({ mappings, canEdit }: { mappings: WasteTypeMapping[]; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ typeWasteValue: "", section: "TF" as Section, confirmed: false, note: "" });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Mapping จาก "Type Waste" (ค่าที่พบจริงในข้อมูล) ไปยัง 1 ใน 5 สาย — แก้ไขได้ที่นี่โดยไม่ต้องแก้โค้ด (§1) แถวที่ยังไม่ยืนยัน
        (unconfirmed) จะแสดงคำเตือนในหน้าสายที่เกี่ยวข้อง
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 uppercase">
            <th className="py-2">Type Waste (ค่าจริง)</th>
            <th>สาย</th>
            <th>สถานะ</th>
            <th>หมายเหตุ</th>
            {canEdit && <th />}
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => (
            <tr key={m.id} className="border-b">
              <td className="py-1.5">{m.typeWasteValue}</td>
              <td>
                {m.section} — {SECTION_LABELS_TH[m.section]}
              </td>
              <td>
                {m.confirmed ? (
                  <span className="text-status-normal">✅ ยืนยันแล้ว</span>
                ) : (
                  <span className="text-status-high">⚠️ ยังไม่ยืนยัน</span>
                )}
              </td>
              <td className="text-gray-500 max-w-xs truncate">{m.note}</td>
              {canEdit && (
                <td>
                  <button className="text-status-urgent text-xs" onClick={() => deleteMappingAction(m.id).then(() => router.refresh())}>
                    ลบ
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {canEdit && (
        <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="space-y-1">
            <label className="label">Type Waste (ค่าจริง)</label>
            <input className="input w-full" value={form.typeWasteValue} onChange={(e) => setForm((f) => ({ ...f, typeWasteValue: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="label">สาย</label>
            <select className="input w-full" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value as Section }))}>
              {SECTION_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={form.confirmed} onChange={(e) => setForm((f) => ({ ...f, confirmed: e.target.checked }))} />
            <label className="text-sm">ยืนยันแล้ว</label>
          </div>
          <div className="space-y-1">
            <label className="label">หมายเหตุ</label>
            <input className="input w-full" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <button
            className="btn-primary"
            onClick={() =>
              upsertMappingAction(form).then(() => {
                setForm({ typeWasteValue: "", section: "TF", confirmed: false, note: "" });
                router.refresh();
              })
            }
          >
            + เพิ่ม Mapping
          </button>
        </div>
      )}
    </div>
  );
}
