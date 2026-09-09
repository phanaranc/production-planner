"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Destination, Section } from "@prisma/client";
import { SECTION_ORDER } from "@/lib/constants";
import { upsertDestinationAction } from "@/app/(app)/settings/actions";

export function DestinationsTab({ destinations, canEdit }: { destinations: Destination[]; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ section: "TF" as Section, name: "", standingNote: "", active: true });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">ปลายทาง/สายย่อยต่อสาย (§3.1) — ใช้ในโมดูลแผนส่งออกรายเดือน</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 uppercase">
            <th className="py-2">สาย</th>
            <th>ปลายทาง</th>
            <th>หมายเหตุ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {destinations.map((d) => (
            <tr key={d.id} className="border-b">
              <td className="py-1.5">{d.section}</td>
              <td>{d.name}</td>
              <td className="text-gray-500">{d.standingNote}</td>
              <td>{d.active ? "ใช้งาน" : "ปิดใช้งาน"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
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
          <div className="space-y-1">
            <label className="label">ชื่อปลายทาง</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="label">หมายเหตุ (เช่น เงื่อนไขรถ)</label>
            <input className="input w-full" value={form.standingNote} onChange={(e) => setForm((f) => ({ ...f, standingNote: e.target.value }))} />
          </div>
          <button
            className="btn-primary"
            onClick={() => upsertDestinationAction(form).then(() => router.refresh())}
          >
            + เพิ่มปลายทาง
          </button>
        </div>
      )}
    </div>
  );
}
