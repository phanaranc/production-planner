"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UnlinkedActualEntryClient } from "@/lib/export-plan-data";
import type { BlockClient } from "@/lib/export-plan-data";
import { assignActualEntryToBlockAction } from "@/app/(app)/export-plan/actions";

export function UnlinkedActualEntriesPanel({
  entries,
  blocks,
  canEdit
}: {
  entries: UnlinkedActualEntryClient[];
  blocks: BlockClient[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (entries.length === 0) return null;

  async function assign(entryId: string) {
    const blockId = selection[entryId];
    if (!blockId) return;
    setBusyId(entryId);
    setError(null);
    try {
      await assignActualEntryToBlockAction(entryId, blockId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "จับคู่ไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-semibold text-navy-900">
          รายการส่งจริงที่นำเข้า — ยังไม่ผูกปลายทาง ({entries.length})
        </h2>
        <p className="text-sm text-gray-500">
          นำเข้าจาก Settings → นำเข้าข้อมูล → นำเข้าแผนส่งออก — ไฟล์ต้นฉบับไม่มีคอลัมน์ปลายทาง เลือกบล็อกที่ตรงกับสายเพื่อจับคู่
        </p>
      </div>
      {error && <p className="text-sm text-status-urgent">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2">วันที่ส่งกาก</th>
              <th className="p-2">Manifest No.</th>
              <th className="p-2">ชื่อลูกค้า</th>
              <th className="p-2">ประเภทกาก</th>
              <th className="p-2">แผนก</th>
              <th className="p-2">นน. (ตัน)</th>
              <th className="p-2">จับคู่ปลายทาง</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const matchingBlocks = blocks.filter((b) => !e.section || b.section === e.section);
              return (
                <tr key={e.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">{e.shipmentDate}</td>
                  <td className="p-2 whitespace-nowrap">{e.manifestNo ?? <span className="text-gray-400">—</span>}</td>
                  <td className="p-2">{e.customerName ?? <span className="text-gray-400">—</span>}</td>
                  <td className="p-2">{e.wasteCategory ?? <span className="text-gray-400">—</span>}</td>
                  <td className="p-2">{e.section ?? <span className="text-gray-400">—</span>}</td>
                  <td className="p-2">{e.weightTon != null ? e.weightTon.toLocaleString("th-TH") : <span className="text-gray-400">—</span>}</td>
                  <td className="p-2">
                    {canEdit ? (
                      <div className="flex gap-1">
                        <select
                          className="input text-xs"
                          value={selection[e.id] ?? ""}
                          onChange={(ev) => setSelection((s) => ({ ...s, [e.id]: ev.target.value }))}
                        >
                          <option value="">เลือกปลายทาง...</option>
                          {matchingBlocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.section} · {b.destinationName}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn-secondary text-xs"
                          disabled={!selection[e.id] || busyId === e.id}
                          onClick={() => assign(e.id)}
                        >
                          จับคู่
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">ต้องมีสิทธิ์แก้ไข</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
