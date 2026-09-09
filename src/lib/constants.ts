import type { Section } from "@prisma/client";

// §1 — fixed by spec scope (unlike WasteTypeMapping, which is genuinely
// meant to grow without a code change). Mirrors .Genco's
// production-constants.ts convention: hardcoded display metadata for a
// closed, spec-defined set of codes.
export const SECTION_ORDER: Section[] = ["TF", "SP", "AR", "FC", "SRF"];

export const SECTION_LABELS_TH: Record<Section, string> = {
  TF: "น้ำเสีย",
  SP: "ตะกอนเหลว",
  AR: "ตะกอนแข็ง",
  FC: "ผ้าปนเปื้อน",
  SRF: "ขยะเชื้อเพลิง"
};

export const SECTION_BADGE_CLASS: Record<Section, string> = {
  TF: "bg-blue-100 text-blue-800",
  SP: "bg-purple-100 text-purple-800",
  AR: "bg-amber-100 text-amber-800",
  FC: "bg-pink-100 text-pink-800",
  SRF: "bg-emerald-100 text-emerald-800"
};

export const ROLE_LABELS_TH: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  PLANNER: "Planner",
  HEAD_OF_OPERATION: "Head of Operation",
  DATA_ENTRY: "ผู้กรอกข้อมูล",
  VIEWER: "ผู้เยี่ยมชม (อ่านอย่างเดียว)"
};

// index = Date.getDay() (0 = Sunday ... 6 = Saturday), per spec §3.2's
// weekday-letter column header. Computed against real dates at render time
// — never a hardcoded per-month header row (the letter under day "1" shifts
// every month).
export const WEEKDAY_LETTERS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export const MONTH_LABELS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export const TRIP_STATUS_LABELS = {
  AWAITING_TRANSPORT: "รอขนส่ง",
  AWAITING_TREATMENT: "รอบำบัด",
  TREATED: "บำบัดแล้ว"
} as const;

export type TripStatus = keyof typeof TRIP_STATUS_LABELS;

export const STATUS_BADGE_CLASS: Record<TripStatus, string> = {
  AWAITING_TRANSPORT: "bg-red-100 text-red-800",
  AWAITING_TREATMENT: "bg-yellow-100 text-yellow-800",
  TREATED: "bg-green-100 text-green-800"
};

// §5 export-plan calendar day-cell legend.
export const DAY_CELL_LABELS = {
  matched: "แผนตรงกับจริง",
  pending: "มีแผนแต่ยังไม่ถึงวันจริง",
  missed: "มีแผนแต่ไม่มีจริง/พลาดแผน",
  unplanned: "ส่งจริงแบบไม่มีแผน",
  none: "ไม่มีแผน/ไม่มีจริง"
} as const;

export type DayCellState = keyof typeof DAY_CELL_LABELS;
