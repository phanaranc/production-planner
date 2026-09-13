// §3.3 — real target-plan/actual grid, confirmed against the real file
// "Plan delivery Haz 2026.xlsx" (2026-09-13, see
// docs/master-prompt-operations-command-center.md §3.3). This REPLACES an
// earlier version of this file that was written blind against the
// *documented* Book2.csv shape and got the plan/actual cell encoding
// wrong in both directions — see git history if that guessed shape is
// ever needed again (it never matched a real file).
//
// Confirmed real structure, one workbook = one file, one worksheet per
// month (name like "แผนจัดส่งโรงปูน Jan 26"; a "ฟอร์มแผนจัดส่งโรงปูน"
// template sheet with no real data is skipped). Within a sheet, repeated
// blocks of:
//   - a "P/A" / day-number header row (day columns start right after
//     the literal "P/A" cell)
//   - one (แผน, จริง) row pair PER DESTINATION underneath, ending at the
//     first row that isn't that exact pair
//
// Confirmed with the user (2026-09-13):
// - a "แผน" day cell holding "l"/"ll"/"lll" means that many trucks are
//   planned that day. This parser only records WHETHER a day is planned
//   (any non-empty mark) — matching ExportPlanBlock.plannedDays' existing
//   boolean-per-day shape in prisma/schema.prisma. The truck count itself
//   is intentionally not persisted (no schema field exists for it, and
//   adding one wasn't asked for).
// - a "จริง" day cell holds the actual shipped weight directly (often a
//   SUM-of-multiple-trips formula) — used as-is, never treated as a flag.
// - SRF (the 5th Section) never appears in this file across any month
//   sheet seen — confirmed with the user this import path can simply not
//   support SRF for now, rather than guessing a mapping for it.
//
// Data-quality quirk confirmed from the real file: a short month's header
// row can carry STALE day-number labels beyond the real day count (Feb's
// header showed "...,27,28,1,2,3" — days 1-3 left over from a 31-day
// template, not real Feb 29-31). Never trust the header labels past the
// real day count — always compute it from the sheet's own (year, month).
//
// Data-quality artifact confirmed from the real file (traced 2026-09-13,
// not a parser bug): several month sheets carry one extra, incomplete
// "Waste Water." block tacked on at the very bottom (e.g. rows 66-69 in
// "Aug 26") — a stray Target plan value (200) with no destination name
// and no แผน/จริง day data at all. This parser correctly surfaces it via
// the "ไม่มีชื่อปลายทาง" warning and excludes it from import (a block
// with no destinationName never gets willImport:true downstream) rather
// than guessing a name for it — this is expected, not something to fix.

export type ParsedActualDay = { day: number; weightTon: number };

export type ParsedPlanBlock = {
  sheetName: string;
  year: number;
  month: number; // 1-12
  wasteCategoryRaw: string; // raw label text, e.g. "Waste Water."
  section: string | null; // mapped TF/SP/AR/FC, or null if unrecognized — never SRF (see above)
  destinationName: string;
  standingNote: string | null; // the block's "หมายเหตุ" column — matches Destination.standingNote (e.g. "ใช้รถ Tanker 15Q เท่านั้น")
  targetPlanTon: number | null;
  plannedDays: number[]; // days with any non-empty "แผน" mark
  actualDays: ParsedActualDay[]; // days with a positive "จริง" weight
  warnings: string[];
};

export type ParsedWorkbookResult = {
  blocks: ParsedPlanBlock[];
  skippedSheets: string[];
};

const WASTE_CATEGORY_TO_SECTION: Record<string, string> = {
  "waste water.": "TF",
  "waste water": "TF",
  "sludge.": "SP",
  "sludge": "SP",
  "ar": "AR",
  "fabric conterminate": "FC"
};

const MONTH_ABBR: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Extracts (year, month) from a sheet name like "แผนจัดส่งโรงปูน Jan 26".
 * Returns null for a sheet that doesn't match (e.g. the blank
 * "ฟอร์มแผนจัดส่งโรงปูน" template — deliberately skipped, never guessed). */
export function parseSheetMonthYear(sheetName: string): { year: number; month: number } | null {
  const m = /([A-Za-z]{3})[A-Za-z]*\s+(\d{2,4})/.exec(sheetName);
  if (!m) return null;
  const month = MONTH_ABBR[m[1].toLowerCase()];
  if (!month) return null;
  let year = parseInt(m[2], 10);
  // Confirmed Gregorian elsewhere in this codebase (see
  // export-actual-mapping.ts parseThaiShortDate) — yy=26 means 2026, the
  // year this was written, not a Buddhist-era 26 (which would be 1826).
  if (year < 100) year += 2000;
  return { year, month };
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && "result" in (v as Record<string, unknown>)) {
    const r = (v as { result: unknown }).result;
    return r == null ? "" : String(r).trim();
  }
  return String(v).trim();
}

function cellNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "object" && "result" in (v as Record<string, unknown>)) {
    const r = (v as { result: unknown }).result;
    return typeof r === "number" && !Number.isNaN(r) ? r : null;
  }
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

/** Minimal shape this parser needs from an exceljs Row/Worksheet, kept
 * structural rather than importing exceljs's types directly so this file
 * stays a plain, framework-agnostic parsing module like its siblings
 * (waste-trip-mapping.ts, export-actual-mapping.ts) — call sites pass a
 * real exceljs Worksheet, which satisfies this shape. */
export type CellRow = { values: unknown[] };
export type CellWorksheet = { name: string; rowCount: number; getRow: (r: number) => CellRow };

export function parsePlanDeliverySheet(ws: CellWorksheet): ParsedPlanBlock[] | { skip: true } {
  const monthYear = parseSheetMonthYear(ws.name);
  if (!monthYear) return { skip: true };
  const { year, month } = monthYear;
  const numDays = daysInMonth(year, month);

  const blocks: ParsedPlanBlock[] = [];
  const rowCount = ws.rowCount;

  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r).values;

    // Locate the day-number header row: the column right after a literal
    // "P/A" cell holding the number 1.
    let dayColStart = -1;
    for (let c = 1; c < row.length - 1; c++) {
      if (cellText(row[c]) === "P/A" && cellNumber(row[c + 1]) === 1) {
        dayColStart = c + 1;
        break;
      }
    }
    if (dayColStart === -1) continue;

    const wasteCategoryRaw = cellText(row[1]);
    const section = WASTE_CATEGORY_TO_SECTION[wasteCategoryRaw.toLowerCase()] ?? null;
    const dayColEnd = dayColStart + numDays - 1;

    let noteColStart = -1;
    let targetColStart = -1;
    for (let c = dayColEnd + 1; c < row.length; c++) {
      const t = cellText(row[c]);
      if (t === "หมายเหตุ" && noteColStart === -1) noteColStart = c;
      if (t === "Target plan (ตัน)" && targetColStart === -1) targetColStart = c;
    }

    // Walk destination row-pairs directly below, stopping at the first
    // row that isn't exactly a (แผน, จริง) pair.
    let pairRow = r + 1;
    while (pairRow + 1 <= rowCount) {
      const planRowVals = ws.getRow(pairRow).values;
      const actualRowVals = ws.getRow(pairRow + 1).values;
      if (cellText(planRowVals[5]) !== "แผน" || cellText(actualRowVals[5]) !== "จริง") break;

      const destinationName = cellText(planRowVals[1]);
      const warnings: string[] = [];
      if (!destinationName) warnings.push("ไม่มีชื่อปลายทาง");
      if (!section) warnings.push(`ไม่รู้จักประเภทกาก "${wasteCategoryRaw}" — ไม่ map เข้า Section ใดได้ (ข้ามบล็อกนี้เมื่อ import จริง)`);

      const plannedDays: number[] = [];
      for (let d = 1; d <= numDays; d++) {
        if (cellText(planRowVals[dayColStart + d - 1])) plannedDays.push(d);
      }
      const actualDays: ParsedActualDay[] = [];
      for (let d = 1; d <= numDays; d++) {
        const v = cellNumber(actualRowVals[dayColStart + d - 1]);
        if (v != null && v > 0) actualDays.push({ day: d, weightTon: v });
      }

      const targetPlanTon =
        targetColStart !== -1 ? cellNumber(planRowVals[targetColStart]) ?? cellNumber(actualRowVals[targetColStart]) : null;
      const standingNoteRaw = noteColStart !== -1 ? cellText(planRowVals[noteColStart]) || cellText(actualRowVals[noteColStart]) : "";

      blocks.push({
        sheetName: ws.name,
        year,
        month,
        wasteCategoryRaw,
        section,
        destinationName,
        standingNote: standingNoteRaw || null,
        targetPlanTon,
        plannedDays,
        actualDays,
        warnings
      });

      pairRow += 2;
    }
    r = pairRow - 1; // resume scanning after this block's rows
  }

  return blocks;
}

export function parsePlanDeliveryWorkbook(sheets: CellWorksheet[]): ParsedWorkbookResult {
  const blocks: ParsedPlanBlock[] = [];
  const skippedSheets: string[] = [];

  for (const ws of sheets) {
    const result = parsePlanDeliverySheet(ws);
    if ("skip" in result) {
      skippedSheets.push(ws.name);
      continue;
    }
    blocks.push(...result);
  }

  return { blocks, skippedSheets };
}
