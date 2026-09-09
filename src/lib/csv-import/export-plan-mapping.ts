// §3 / §7 — Book2.csv is a wide, block-structured sheet (section/destination
// header rows, a "แผน" row and a "จริง" row of day-1..31 marks), not a flat
// table like Book1.csv. This row-scans for block boundaries rather than
// assuming fixed row numbers, since a real file's exact layout hasn't been
// seen yet (no sample ever existed on this machine — see plan doc).
//
// NOTE: this parser is written to the *documented* shape in the master
// prompt (§3.2/§3.3) but has never been run against a real Book2.csv, only
// against the shape description. Treat it as a starting point to adjust
// once a real file is available, not as a fully field-tested importer —
// unlike waste-trip-mapping.ts, which mirrors the sibling project's
// already-validated real columns.

export type ParsedPlanDay = { day: number; planned: boolean; hasActual: boolean };
export type ParsedBlock = {
  section: string;
  destinationName: string;
  standingNote?: string;
  days: ParsedPlanDay[];
};

const SECTION_LABELS = ["TF", "SP", "AR", "FC", "SRF"];

function isDayHeaderRow(cells: string[]): boolean {
  const numeric = cells.filter((c) => /^\d{1,2}$/.test(c.trim()));
  return numeric.length >= 20; // a real month header row has ~28-31 day numbers
}

/**
 * Row-scans a Book2-shaped 2D array (already split into cells, e.g. via
 * papaparse without `header: true`) into blocks. Each block is recognized by
 * a "แผน"/"จริง" pair of rows following a row whose first non-empty cell
 * matches a destination name under the current section.
 */
export function parseExportPlanRows(rows: string[][]): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let currentSection = "";
  let dayHeaderRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => (c ?? "").trim());
    const firstCell = cells[0] ?? "";

    if (SECTION_LABELS.includes(firstCell.toUpperCase())) {
      currentSection = firstCell.toUpperCase();
      continue;
    }
    if (isDayHeaderRow(cells)) {
      dayHeaderRowIndex = i;
      continue;
    }
    if (cells[1] === "แผน" || cells[2] === "แผน") {
      const destinationName = cells[0] || cells.find((c) => c && c !== "แผน") || "(ไม่ระบุปลายทาง)";
      const planRow = cells;
      const actualRow = rows[i + 1]?.map((c) => (c ?? "").trim()) ?? [];
      const dayHeaderCells = dayHeaderRowIndex >= 0 ? rows[dayHeaderRowIndex].map((c) => (c ?? "").trim()) : [];

      const days: ParsedPlanDay[] = [];
      dayHeaderCells.forEach((h, colIdx) => {
        if (!/^\d{1,2}$/.test(h)) return;
        const day = parseInt(h, 10);
        const planned = (planRow[colIdx] ?? "").toLowerCase() === "l";
        const hasActual = (actualRow[colIdx] ?? "").toLowerCase() === "l";
        days.push({ day, planned, hasActual });
      });

      blocks.push({ section: currentSection, destinationName, days });
      i += 1; // skip the "จริง" row we just consumed
    }
  }

  return blocks;
}
