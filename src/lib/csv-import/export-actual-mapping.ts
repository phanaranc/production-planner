// Real actual-shipment export ("Raw Data รายงานข้อมูลการส่งของเสีย
// สำหรับ ...xlsx" — ชีต "ข้อมูลรับเข้า-บำบัด") — a FLAT table, one row per
// shipment, keyed by Manifest No. This is unrelated to the wide
// day-1..31 "แผน/จริง" grid that export-plan-mapping.ts parses (that grid
// is the *target-plan* shape, never validated against a real file; this
// file is the *actual-shipment* shape, now confirmed against a real file).
//
// Confirmed real header row (see docs/master-prompt-operations-command-center.md
// §3.1 for the sibling Manifest dataset this lines up with):
//   วันที่ส่งกาก,วันที่บำบัด,Manifest No.,ชื่อลูกค้า,ประเภทกาก,แผนกบำบัด,นน.ส่งออก(ตัน),หมายเหตุ
//
// Data-quality note confirmed from the sample file (checked by actually
// counting comma positions against the header, not assumed): of 1701 rows,
// 1448 carry a bare decimal number in the LAST column position — which the
// header row makes it "หมายเหตุ" (note), NOT "นน.ส่งออก(ตัน)" (the actual
// weight column, which is empty on those rows). Confirmed with the user
// (2026-09-13) that this is a known artifact of that particular sample
// file, not a real-file data problem: a bare number sitting alone in
// "หมายเหตุ" while every other column (including นน.ส่งออก(ตัน)) is blank
// IS the export weight for that row, just shifted one column right. That
// recovery is applied below — but it only ever fires on this exact narrow
// shape (note is a bare number AND weightTon/shipmentDate/manifestNo are
// all blank); a row with real remark text in หมายเหตุ is never touched.
// Note this does NOT manufacture the row's other missing fields — a
// shifted-weight row still has no shipmentDate/manifestNo of its own.
// shipmentDate is nullable on ExportActualEntry (per explicit user
// decision, 2026-09-13): such a row is still imported with weightTon and
// no date, surfaced in the UI as "ไม่ทราบวันที่" rather than a guessed date.

export const EXPORT_ACTUAL_HEADER_MAP: Record<string, string> = {
  "วันที่ส่งกาก": "shipmentDate",
  "วันที่บำบัด": "treatmentDate",
  "Manifest No.": "manifestNo",
  "ชื่อลูกค้า": "customerName",
  "ประเภทกาก": "wasteCategory",
  "แผนกบำบัด": "section", // values seen (SP) match the existing Section enum (TF/SP/AR/FC/SRF) 1:1
  "นน.ส่งออก(ตัน)": "weightTon",
  "หมายเหตุ": "note"
};

export const EXPORT_ACTUAL_REQUIRED_HEADERS = [
  "วันที่ส่งกาก",
  "Manifest No.",
  "แผนกบำบัด",
  "นน.ส่งออก(ตัน)"
];

const KNOWN_SECTIONS = ["TF", "SP", "AR", "FC", "SRF"];

/** dd/mm/yy -> yyyy-mm-dd. The file's "yy" is confirmed Gregorian (not
 * Buddhist-era): real rows show yy=26 and this code was written in 2026 —
 * a Buddhist-era "26" would be the year 1826. Returns undefined (never a
 * guessed date) for anything that isn't cleanly dd/mm/yy. */
export function parseThaiShortDate(raw: string): string | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(raw.trim());
  if (!m) return undefined;
  const [, d, mo, yy] = m;
  const year = 2000 + parseInt(yy, 10);
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export type ExportActualRowQuality = "ok" | "incomplete";

export type ParsedExportActualRow = {
  shipmentDate?: string; // normalized yyyy-mm-dd, or undefined if blank/unparseable
  treatmentDate?: string;
  manifestNo?: string;
  customerName?: string;
  wasteCategory?: string;
  section?: string; // uppercased; left as-is (and flagged) if it doesn't match a known Section
  weightTon?: string;
  note?: string;
  quality: ExportActualRowQuality;
  qualityNotes: string[];
};

/** Converts one raw CSV/Excel row (header -> string value) into a staging
 * row. Never writes to the database directly — always run through the
 * import staging preview (required-approval step) first. */
export function rawRowToExportActualInput(row: Record<string, string>): ParsedExportActualRow {
  const out: Record<string, string | undefined> = {};
  for (const [header, field] of Object.entries(EXPORT_ACTUAL_HEADER_MAP)) {
    const raw = row[header];
    out[field] = raw === undefined || raw === "" ? undefined : raw.trim();
  }
  if (out.section) out.section = out.section.toUpperCase();

  const qualityNotes: string[] = [];

  // Normalize dates, but only if they were present — never invent one.
  const rawShipmentDate = out.shipmentDate;
  out.shipmentDate = rawShipmentDate ? parseThaiShortDate(rawShipmentDate) : undefined;
  if (rawShipmentDate && !out.shipmentDate) {
    qualityNotes.push(`วันที่ส่งกาก "${rawShipmentDate}" ไม่ตรงรูปแบบ dd/mm/yy ที่คาดไว้`);
  }
  const rawTreatmentDate = out.treatmentDate;
  out.treatmentDate = rawTreatmentDate ? parseThaiShortDate(rawTreatmentDate) : undefined;
  if (rawTreatmentDate && !out.treatmentDate) {
    qualityNotes.push(`วันที่บำบัด "${rawTreatmentDate}" ไม่ตรงรูปแบบ dd/mm/yy ที่คาดไว้`);
  }

  // A bare decimal sitting in "หมายเหตุ" while the real weight column is
  // empty, with every other column also empty, is suspicious enough to call
  // out explicitly — most likely a value that landed in the wrong column
  // in the source spreadsheet — but it is NOT auto-corrected into weightTon.
  const looksLikeANumber = out.note != null && /^\d+(\.\d+)?$/.test(out.note);
  if (looksLikeANumber && !out.weightTon && !rawShipmentDate && !out.manifestNo) {
    // Confirmed shifted-weight recovery (see file header comment) — move it,
    // don't just flag it. Still non-blocking info, not an error: the row
    // may still be rejected below for missing shipmentDate/manifestNo.
    qualityNotes.push(`ย้ายค่า "${out.note}" จากคอลัมน์หมายเหตุมาเป็น นน.ส่งออก(ตัน) (คอลัมน์ตกในไฟล์ตัวอย่าง — ยืนยันกับผู้ใช้แล้ว)`);
    out.weightTon = out.note;
    out.note = undefined;
  }
  if (!out.weightTon) qualityNotes.push("ไม่มี นน.ส่งออก(ตัน)");
  if (!out.manifestNo) qualityNotes.push("ไม่มี Manifest No.");
  if (!rawShipmentDate) qualityNotes.push("ไม่มีวันที่ส่งกาก — จะนำเข้าเป็น \"ไม่ทราบวันที่\"");
  if (out.section && !KNOWN_SECTIONS.includes(out.section)) {
    qualityNotes.push(`แผนกบำบัด "${out.section}" ไม่ตรงกับ Section ที่รู้จัก (TF/SP/AR/FC/SRF)`);
  }

  return {
    ...out,
    quality: qualityNotes.length > 0 ? "incomplete" : "ok",
    qualityNotes
  };
}

/** Rows where every mapped field is blank (fully empty CSV line) — skip
 * these silently rather than surfacing them as errors. */
export function isBlankExportActualRow(row: ParsedExportActualRow): boolean {
  return !row.shipmentDate && !row.treatmentDate && !row.manifestNo && !row.customerName && !row.wasteCategory && !row.section && !row.weightTon && !row.note;
}
