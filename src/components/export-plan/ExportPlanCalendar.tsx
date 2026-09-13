"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { BlockClient } from "@/lib/export-plan-data";
import { daysInMonth, dayCellState } from "@/lib/export-plan-data";
import { WEEKDAY_LETTERS_TH, SECTION_LABELS_TH } from "@/lib/constants";
import { setTargetPlanAction, setBlockRemarkAction } from "@/app/(app)/export-plan/actions";
import { DayEditPopover } from "./DayEditPopover";

const CELL_CLASS: Record<string, string> = {
  matched: "bg-calendar-matched text-white",
  pending: "bg-calendar-pending text-white",
  missed: "bg-calendar-missed text-white",
  unplanned: "bg-calendar-unplanned text-white",
  none: "bg-gray-100 text-gray-400"
};

export function ExportPlanCalendar({
  year,
  month,
  blocks,
  companies,
  canEdit
}: {
  year: number;
  month: number;
  blocks: BlockClient[];
  companies: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [popover, setPopover] = useState<{ blockId: string; day: number } | null>(null);
  const nDays = daysInMonth(year, month);
  const today = new Date();

  const bySection = new Map<string, BlockClient[]>();
  for (const b of blocks) {
    const list = bySection.get(b.section) ?? [];
    list.push(b);
    bySection.set(b.section, list);
  }

  const activeBlock = popover ? blocks.find((b) => b.id === popover.blockId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
        <Legend color="bg-calendar-matched" label="แผนตรงกับจริง" />
        <Legend color="bg-calendar-pending" label="มีแผนแต่ยังไม่ถึงวันจริง" />
        <Legend color="bg-calendar-missed" label="มีแผนแต่ไม่มีจริง/พลาดแผน" />
        <Legend color="bg-calendar-unplanned" label="ส่งจริงแบบไม่มีแผน" />
      </div>

      {[...bySection.entries()].map(([section, sectionBlocks]) => (
        <div key={section} className="card">
          <h3 className="font-bold text-navy-900 mb-3">
            {section} — {SECTION_LABELS_TH[section as keyof typeof SECTION_LABELS_TH]}
          </h3>
          <div className="space-y-4">
            {sectionBlocks.map((block) => (
              <div key={block.id} className="border rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{block.destinationName}</span>
                    {block.standingNote && (
                      <span className="ml-2 inline-block rounded-full bg-amber-100 text-amber-800 text-xs px-2 py-0.5">
                        {block.standingNote}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <label className="text-gray-500">Target plan (ตัน)</label>
                    {canEdit ? (
                      <input
                        type="number"
                        step="0.001"
                        className="input w-28"
                        defaultValue={block.targetPlanTon ?? ""}
                        onBlur={(e) => setTargetPlanAction(block.id, e.target.value ? Number(e.target.value) : null).then(() => router.refresh())}
                      />
                    ) : (
                      <span>{block.targetPlanTon?.toLocaleString("th-TH") ?? "—"}</span>
                    )}
                    <span className="text-gray-400">|</span>
                    <span>
                      รวมจริง: {block.totalActualTon.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตัน
                      {block.achievementPct != null && ` (${block.achievementPct.toFixed(1)}%)`}
                    </span>
                    {block.undatedActualCount > 0 && (
                      <span className="text-amber-600 text-xs" title="รายการเหล่านี้นับรวมในยอดข้างต้นแล้ว แต่ไม่ปรากฏในช่องปฏิทินเพราะไม่ทราบวันที่">
                        (รวม {block.undatedActualCount} รายการไม่ทราบวันที่)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: `repeat(${nDays}, minmax(24px, 1fr))`, gap: 2 }}>
                  {Array.from({ length: nDays }, (_, i) => i + 1).map((day) => {
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const entriesForDay = block.actualEntries.filter((e) => e.shipmentDate === dateStr);
                    const weekday = new Date(year, month - 1, day).getDay();
                    const state = dayCellState(day, block.plannedDays, entriesForDay, today);
                    return (
                      <button
                        key={day}
                        onClick={() => setPopover({ blockId: block.id, day })}
                        className={clsx("aspect-square rounded text-[10px] flex flex-col items-center justify-center", CELL_CLASS[state])}
                        title={`${day} (${WEEKDAY_LETTERS_TH[weekday]})`}
                      >
                        <span>{day}</span>
                        <span className="opacity-70">{WEEKDAY_LETTERS_TH[weekday]}</span>
                      </button>
                    );
                  })}
                </div>

                {canEdit && (
                  <input
                    className="input w-full mt-2 text-xs"
                    placeholder="หมายเหตุ..."
                    defaultValue={block.remark ?? ""}
                    onBlur={(e) => setBlockRemarkAction(block.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {activeBlock && popover && (
        <DayEditPopover
          open={!!popover}
          onClose={() => setPopover(null)}
          block={activeBlock}
          day={popover.day}
          year={year}
          month={month}
          companies={companies}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={clsx("inline-block w-3 h-3 rounded", color)} />
      {label}
    </span>
  );
}
