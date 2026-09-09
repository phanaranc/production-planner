import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getOrCreateMonth, getBlocksForMonth, getMonthSummary, daysInMonth } from "@/lib/export-plan-data";
import { WEEKDAY_LETTERS_TH, MONTH_LABELS_TH } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? "", 10);
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? "", 10);
  if (!year || !month) return NextResponse.json({ error: "year/month required" }, { status: 400 });

  const monthRecord = await getOrCreateMonth(year, month);
  const blocks = await getBlocksForMonth(monthRecord.id);
  const summary = await getMonthSummary(year, month, blocks);
  const nDays = daysInMonth(year, month);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${MONTH_LABELS_TH[month - 1]} ${year}`);

  const headerRow = ["สาย", "ปลายทาง", "แถว", ...Array.from({ length: nDays }, (_, i) => i + 1), "รวมจริง (ตัน)", "Target plan (ตัน)", "%"];
  ws.addRow(headerRow);
  const weekdayRow = ["", "", "", ...Array.from({ length: nDays }, (_, i) => WEEKDAY_LETTERS_TH[new Date(year, month - 1, i + 1).getDay()]), "", "", ""];
  ws.addRow(weekdayRow);
  ws.getRow(1).font = { bold: true };
  ws.getRow(2).font = { italic: true, size: 9 };

  for (const b of blocks) {
    const planRow = ws.addRow([
      b.section,
      b.destinationName,
      "แผน",
      ...Array.from({ length: nDays }, (_, i) => (b.plannedDays.includes(i + 1) ? "l" : "")),
      "",
      b.targetPlanTon ?? "",
      ""
    ]);
    const actualRow = ws.addRow([
      "",
      "",
      "จริง",
      ...Array.from({ length: nDays }, (_, i) => {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        return b.actualEntries.some((e) => e.shipmentDate === dateStr) ? "l" : "";
      }),
      b.totalActualTon.toFixed(2),
      "",
      b.achievementPct != null ? `${b.achievementPct.toFixed(1)}%` : ""
    ]);
    planRow.font = { bold: true };
    if (b.standingNote) {
      ws.addRow(["", "", "หมายเหตุ: " + b.standingNote]);
    }
  }

  ws.addRow([]);
  ws.addRow(["สรุปทั้งเดือน", "", "Target plan รวม", summary.targetPlanTotalTon.toFixed(2), "Actual รวม", summary.actualTotalTon.toFixed(2), "% ความสำเร็จ", summary.achievementPct?.toFixed(1) ?? "-"]);
  ws.addRow(["", "", "% การส่งเผา (ส่งออก/รับเข้า)", summary.incinerationPct?.toFixed(1) ?? "-"]);

  ws.addRow([]);
  ws.addRow(["ผู้จัดทำ", monthRecord.preparedByName ?? "", "วันที่", monthRecord.preparedAt?.toLocaleDateString("th-TH") ?? ""]);
  ws.addRow(["ผู้รับแผนงาน", monthRecord.receivedByName ?? "", "วันที่", monthRecord.receivedAt?.toLocaleDateString("th-TH") ?? ""]);
  ws.addRow(["ผู้ติดตามแผนงาน", monthRecord.trackedByName ?? "", "วันที่", monthRecord.trackedAt?.toLocaleDateString("th-TH") ?? ""]);

  ws.columns.forEach((col) => (col.width = 6));
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 8;

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export-plan-${year}-${String(month).padStart(2, "0")}.xlsx"`
    }
  });
}
