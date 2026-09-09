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
