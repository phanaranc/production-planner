import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { getOrCreateMonth, getBlocksForMonth, getMonthSummary, daysInMonth } from "@/lib/export-plan-data";
import { MONTH_LABELS_TH } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

Font.register({
  family: "NotoSansThai",
  fonts: [
    { src: path.join(process.cwd(), "src/assets/fonts/NotoSansThai-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "src/assets/fonts/NotoSansThai-Bold.ttf"), fontWeight: "bold" }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: "NotoSansThai", fontSize: 8 },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 8, color: "#14304D" },
  blockTitle: { fontSize: 9, fontWeight: "bold", marginTop: 6 },
  row: { flexDirection: "row", borderBottom: "0.5px solid #ccc" },
  cell: { width: 16, textAlign: "center", padding: 1 },
  labelCell: { width: 70, padding: 1 },
  summary: { marginTop: 12, fontSize: 9 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  signBox: { width: "30%", borderTop: "0.5px solid #000", paddingTop: 4, textAlign: "center", fontSize: 8 }
});

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? "", 10);
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? "", 10);
  if (!year || !month) return NextResponse.json({ error: "year/month required" }, { status: 400 });

  const monthRecord = await getOrCreateMonth(year, month);
  const blocks = await getBlocksForMonth(monthRecord.id);
  const summary = await getMonthSummary(year, month, blocks);
  const nDays = daysInMonth(year, month);
  const days = Array.from({ length: nDays }, (_, i) => i + 1);

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, `แผนส่งออกรายเดือน — ${MONTH_LABELS_TH[month - 1]} ${year}`),
      ...blocks.map((b) =>
        React.createElement(
          View,
          { key: b.id },
          React.createElement(Text, { style: styles.blockTitle }, `${b.section} — ${b.destinationName}${b.standingNote ? " (" + b.standingNote + ")" : ""}`),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.labelCell }, "แผน"),
            ...days.map((d) => React.createElement(Text, { key: d, style: styles.cell }, b.plannedDays.includes(d) ? "l" : ""))
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.labelCell }, "จริง"),
            ...days.map((d) => {
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const has = b.actualEntries.some((e) => e.shipmentDate === dateStr);
              return React.createElement(Text, { key: d, style: styles.cell }, has ? "l" : "");
            })
          ),
          React.createElement(
            Text,
            { style: { fontSize: 8, marginTop: 2 } },
            `รวมจริง ${b.totalActualTon.toFixed(2)} ตัน / Target ${b.targetPlanTon?.toFixed(2) ?? "-"} ตัน (${b.achievementPct != null ? b.achievementPct.toFixed(1) + "%" : "-"})`
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.summary },
        React.createElement(
          Text,
          {},
          `Target plan รวม ${summary.targetPlanTotalTon.toFixed(2)} ตัน | Actual รวม ${summary.actualTotalTon.toFixed(2)} ตัน | % ความสำเร็จ ${summary.achievementPct?.toFixed(1) ?? "-"}% | % การส่งเผา ${summary.incinerationPct?.toFixed(1) ?? "-"}%`
        )
      ),
      React.createElement(
        View,
        { style: styles.signRow },
        React.createElement(
          View,
          { style: styles.signBox },
          React.createElement(Text, {}, monthRecord.preparedByName ?? "____________________"),
          React.createElement(Text, {}, `ผู้จัดทำ  วันที่ ${monthRecord.preparedAt?.toLocaleDateString("th-TH") ?? "__/__/____"}`)
        ),
        React.createElement(
          View,
          { style: styles.signBox },
          React.createElement(Text, {}, monthRecord.receivedByName ?? "____________________"),
          React.createElement(Text, {}, `ผู้รับแผนงาน  วันที่ ${monthRecord.receivedAt?.toLocaleDateString("th-TH") ?? "__/__/____"}`)
        ),
        React.createElement(
          View,
          { style: styles.signBox },
          React.createElement(Text, {}, monthRecord.trackedByName ?? "____________________"),
          React.createElement(Text, {}, `ผู้ติดตามแผนงาน  วันที่ ${monthRecord.trackedAt?.toLocaleDateString("th-TH") ?? "__/__/____"}`)
        )
      )
    )
  );

  const buffer = await renderToBuffer(doc as any);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="export-plan-${year}-${String(month).padStart(2, "0")}.pdf"`
    }
  });
}
