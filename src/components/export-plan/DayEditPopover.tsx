"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlockClient } from "@/lib/export-plan-data";
import { togglePlanDayAction, upsertActualEntryAction, deleteActualEntryAction } from "@/app/(app)/export-plan/actions";

export function DayEditPopover({
  open,
  onClose,
  block,
  day,
  year,
  month,
  companies,
  canEdit
}: {
  open: boolean;
  onClose: () => void;
  block: BlockClient;
  day: number;
  year: number;
  month: number;
  companies: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const entriesForDay = block.actualEntries.filter((e) => e.shipmentDate === dateStr);
  const isPlanned = block.plannedDays.includes(day);

  const [weight, setWeight] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} onCancel={onClose} className="rounded-xl p-0 w-full max-w-md backdrop:bg-black/40">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-navy-900">
            {block.destinationName} — วันที่ {day}/{month}/{year}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={isPlanned}
            disabled={!canEdit}
            onChange={() => togglePlanDayAction(block.id, day).then(() => router.refresh())}
          />
          มีแผนส่งออกวันนี้
        </label>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">รายการส่งจริง</h4>
          {entriesForDay.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรายการส่งจริงในวันนี้</p>}
          {entriesForDay.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm border rounded-md px-2 py-1">
              <span>
                {e.weightTon != null ? `${e.weightTon.toLocaleString("th-TH")} ตัน` : "ยังไม่ระบุน้ำหนัก"} · {e.transportCompanyName ?? "ไม่ระบุบริษัทขนส่ง"}
              </span>
              {canEdit && (
                <button
                  className="text-status-urgent text-xs"
                  onClick={() => deleteActualEntryAction(e.id).then(() => router.refresh())}
                >
                  ลบ
                </button>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="space-y-2 border-t pt-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">เพิ่มรายการส่งจริง</h4>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.001"
                placeholder="น้ำหนัก (ตัน)"
                className="input flex-1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <select className="input flex-1" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">บริษัทขนส่ง...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <input placeholder="หมายเหตุ" className="input w-full" value={note} onChange={(e) => setNote(e.target.value)} />
            <button
              className="btn-primary w-full"
              onClick={() =>
                upsertActualEntryAction({
                  blockId: block.id,
                  shipmentDate: dateStr,
                  weightTon: weight ? Number(weight) : null,
                  transportCompanyId: companyId || null,
                  note
                }).then(() => {
                  setWeight("");
                  setCompanyId("");
                  setNote("");
                  router.refresh();
                })
              }
            >
              บันทึกรายการส่งจริง
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
