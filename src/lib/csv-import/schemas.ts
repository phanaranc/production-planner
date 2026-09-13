import { z } from "zod";

// Shared validation for both the WasteTrip form/modal and the CSV import
// dry-run — one source of truth so a hand-entered row and an imported row
// are held to the same standard.
export const wasteTripInputSchema = z.object({
  receivedDate: z.string().min(1, "กรุณาระบุวันที่รับของเสีย"),
  transportDocumentNo: z.string().min(1, "กรุณาระบุใบกำกับการขนส่งเลขที่"),
  customerCode: z.string().min(1, "กรุณาระบุรหัสลูกค้า"),
  customerName: z.string().min(1, "กรุณาระบุชื่อลูกค้า"),
  saleOrder: z.string().min(1, "กรุณาระบุ Sale Order"),
  wasteCode: z.string().min(1, "กรุณาระบุ Waste Code"),
  wasteName: z.string().min(1, "กรุณาระบุ Waste Name"),
  saleName: z.string().min(1, "กรุณาระบุ Sale Name"),
  saleSupport: z.string().optional().nullable(),
  receivedWeightTon: z.coerce.number().positive("น้ำหนักรับเข้าต้องมากกว่า 0"),
  transportConfirmed: z.coerce.boolean().optional().default(false),
  treatedWeightTon: z.coerce.number().nonnegative().optional().nullable(),
  treatedDate: z.string().optional().nullable(),
  typeWasteRaw: z.string().min(1, "กรุณาระบุ Type Waste"),
  offSpec: z.coerce.boolean().optional().default(false),
  offSpecNote: z.string().optional().nullable(),
  remark: z.string().optional().nullable()
});

export type WasteTripInput = z.infer<typeof wasteTripInputSchema>;

// Real flat actual-shipment export (see
// src/lib/csv-import/export-actual-mapping.ts for the header map and the
// merged-cell data-quality note). Only shipmentDate/weightTon are required
// to persist a row — every other column is genuinely optional in this
// source (a row's Manifest No./customer/waste-category context can be
// legitimately absent even once the merged-cell artifact is accounted
// for), but their absence is still surfaced as a warning in the import
// preview so the importing user can decide whether to fix the source file.
export const exportActualImportInputSchema = z.object({
  shipmentDate: z.string().min(1, "ไม่มีวันที่ส่งกาก (อาจเป็นผลจากเซลรวมในไฟล์ต้นฉบับ — ตรวจสอบไฟล์ก่อน import)"),
  treatmentDate: z.string().optional(),
  manifestNo: z.string().optional(),
  customerName: z.string().optional(),
  wasteCategory: z.string().optional(),
  section: z.string().optional(),
  weightTon: z.coerce.number().positive("นน.ส่งออก(ตัน) ต้องมากกว่า 0"),
  note: z.string().optional()
});

export type ExportActualImportInput = z.infer<typeof exportActualImportInputSchema>;
