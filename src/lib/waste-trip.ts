import type { WasteTrip, WasteTypeMapping } from "@prisma/client";
import type { TripStatus } from "@/lib/constants";

// §2 "คอลัมน์คำนวณ" — NEVER persisted. Computed fresh from stored columns on
// every query result so they can never go stale. Also the Decimal->number /
// Date->string serialization boundary needed to pass Prisma rows into
// Client Components (Prisma Decimal is not RSC-serializable as-is).

export type WasteTripClient = {
  id: string;
  receivedDate: string;
  transportDocumentNo: string;
  customerCode: string;
  customerName: string;
  saleOrder: string;
  wasteCode: string;
  wasteName: string;
  saleName: string;
  saleSupport: string | null;
  receivedWeightTon: number;
  transportConfirmed: boolean;
  treatedWeightTon: number | null;
  treatedDate: string | null;
  typeWasteRaw: string;
  offSpec: boolean;
  offSpecNote: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  // derived
  status: TripStatus;
  section: string | null; // null => unmapped Type Waste value
  sectionConfirmed: boolean;
  treatmentDurationDays: number | null;
  weightDifferenceTon: number | null;
};

export function deriveStatus(trip: Pick<WasteTrip, "transportConfirmed" | "treatedDate">): TripStatus {
  if (!trip.transportConfirmed) return "AWAITING_TRANSPORT";
  if (!trip.treatedDate) return "AWAITING_TREATMENT";
  return "TREATED";
}

/** §1 — resolves a raw Type Waste value to one of the 5 sections via the
 * Settings-editable mapping table. Returns null (never a guess) if no
 * mapping row matches. */
export function resolveSection(
  typeWasteRaw: string,
  mappings: Pick<WasteTypeMapping, "typeWasteValue" | "section" | "confirmed">[]
): { section: string | null; confirmed: boolean } {
  const match = mappings.find((m) => m.typeWasteValue === typeWasteRaw);
  if (!match) return { section: null, confirmed: false };
  return { section: match.section, confirmed: match.confirmed };
}

export function mapWasteTripForClient(
  trip: WasteTrip,
  mappings: Pick<WasteTypeMapping, "typeWasteValue" | "section" | "confirmed">[]
): WasteTripClient {
  const { section, confirmed } = resolveSection(trip.typeWasteRaw, mappings);
  const receivedWeight = Number(trip.receivedWeightTon);
  const treatedWeight = trip.treatedWeightTon != null ? Number(trip.treatedWeightTon) : null;

  const treatmentDurationDays =
    trip.treatedDate != null
      ? Math.round((trip.treatedDate.getTime() - trip.receivedDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const weightDifferenceTon = treatedWeight != null ? receivedWeight - treatedWeight : null;

  return {
    id: trip.id,
    receivedDate: trip.receivedDate.toISOString().slice(0, 10),
    transportDocumentNo: trip.transportDocumentNo,
    customerCode: trip.customerCode,
    customerName: trip.customerName,
    saleOrder: trip.saleOrder,
    wasteCode: trip.wasteCode,
    wasteName: trip.wasteName,
    saleName: trip.saleName,
    saleSupport: trip.saleSupport,
    receivedWeightTon: receivedWeight,
    transportConfirmed: trip.transportConfirmed,
    treatedWeightTon: treatedWeight,
    treatedDate: trip.treatedDate ? trip.treatedDate.toISOString().slice(0, 10) : null,
    typeWasteRaw: trip.typeWasteRaw,
    offSpec: trip.offSpec,
    offSpecNote: trip.offSpecNote,
    remark: trip.remark,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    status: deriveStatus(trip),
    section,
    sectionConfirmed: confirmed,
    treatmentDurationDays,
    weightDifferenceTon
  };
}

/** Hard cap for the in-memory sort/paginate fallback used only when sorting
 * by a derived column (treatmentDurationDays / weightDifferenceTon) — see
 * schema.prisma header comment + plan doc for why this isn't a Postgres view. */
export const DERIVED_SORT_ROW_CAP = 5000;
