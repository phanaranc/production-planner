// §2 / §7 — exact Thai header (as documented in the master prompt) <-> Prisma
// field mapping, so a real Book1.csv can be imported without any translation
// layer beyond this file.
export const WASTE_TRIP_HEADER_MAP: Record<string, string> = {
  "วันที่รับของเสีย": "receivedDate",
  "ใบกำกับการขนส่งเลขที่": "transportDocumentNo",
  "รหัสลูกค้า": "customerCode",
  "ชื่อลูกค้า": "customerName",
  "Sale Order": "saleOrder",
  "Waste Code": "wasteCode",
  "Waste Name": "wasteName",
  "Sale Name": "saleName",
  "Sale Support": "saleSupport",
  "น้ำหนักรับเข้า (ตัน)": "receivedWeightTon",
  "บันทึกขนจริง": "transportConfirmed",
  "น้ำหนักบำบัด (ตัน)": "treatedWeightTon",
  "วันที่บำบัดของเสีย": "treatedDate",
  "Type Waste": "typeWasteRaw",
  "OFF SPEC": "offSpec",
  "Remark": "remark"
};

export const WASTE_TRIP_REQUIRED_HEADERS = [
  "วันที่รับของเสีย",
  "ใบกำกับการขนส่งเลขที่",
  "รหัสลูกค้า",
  "ชื่อลูกค้า",
  "Sale Order",
  "Waste Code",
  "Waste Name",
  "Sale Name",
  "น้ำหนักรับเข้า (ตัน)",
  "Type Waste"
];

function truthy(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "y" || s === "yes" || s === "true" || s === "1" || s === "ใช่";
}

/** Converts one raw CSV/Excel row (header -> string value) into the shape
 * `wasteTripInputSchema` expects. Does not validate — call the schema after. */
export function rawRowToWasteTripInput(row: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [header, field] of Object.entries(WASTE_TRIP_HEADER_MAP)) {
    const raw = row[header];
    if (raw === undefined || raw === "") continue;
    if (field === "transportConfirmed" || field === "offSpec") {
      out[field] = truthy(raw);
    } else if (field === "receivedWeightTon" || field === "treatedWeightTon") {
      out[field] = raw;
    } else {
      out[field] = raw.trim();
    }
  }
  return out;
}
