import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma, Section } from "@prisma/client";
import { SECTION_ORDER, SECTION_LABELS_TH, TRIP_STATUS_LABELS, type TripStatus } from "@/lib/constants";
import { mapWasteTripForClient, DERIVED_SORT_ROW_CAP, type WasteTripClient } from "@/lib/waste-trip";
import { WasteTripTable } from "@/components/waste-trip/WasteTripTable";
import { requireUser } from "@/lib/current-user";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const DERIVED_SORT_KEYS = new Set(["treatmentDurationDays", "weightDifferenceTon"]);
const PAGE_SIZE = 50;

function statusWhere(status: string | undefined): Prisma.WasteTripWhereInput {
  if (status === "AWAITING_TRANSPORT") return { transportConfirmed: false };
  if (status === "AWAITING_TREATMENT") return { transportConfirmed: true, treatedDate: null };
  if (status === "TREATED") return { treatedDate: { not: null } };
  return {};
}

export default async function LinePage({
  params,
  searchParams
}: {
  params: { section: string };
  searchParams: Record<string, string | undefined>;
}) {
  const section = params.section.toUpperCase() as Section;
  if (!SECTION_ORDER.includes(section)) notFound();

  const session = await requireUser();

  const mappings = await prisma.wasteTypeMapping.findMany({ where: { section } });
  const typeWasteValues = mappings.map((m) => m.typeWasteValue);

  const { q, from, to, customer, status, sort, dir, page: pageStr } = searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const where: Prisma.WasteTripWhereInput = {
    typeWasteRaw: { in: typeWasteValues.length > 0 ? typeWasteValues : ["__none__"] },
    ...statusWhere(status),
    ...(from ? { receivedDate: { gte: new Date(from) } } : {}),
    ...(to ? { receivedDate: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } } : {}),
    ...(customer ? { OR: [{ customerCode: { contains: customer, mode: "insensitive" } }, { customerName: { contains: customer, mode: "insensitive" } }] } : {}),
    ...(q
      ? {
          OR: [
            { transportDocumentNo: { contains: q, mode: "insensitive" } },
            { customerCode: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { wasteCode: { contains: q, mode: "insensitive" } },
            { wasteName: { contains: q, mode: "insensitive" } },
            { saleOrder: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  let rows: WasteTripClient[];
  let total: number;

  if (sort && DERIVED_SORT_KEYS.has(sort)) {
    // §2 — derived-column sort: bounded in-memory fallback (see plan doc / schema.prisma header).
    const all = await prisma.wasteTrip.findMany({ where, take: DERIVED_SORT_ROW_CAP });
    total = await prisma.wasteTrip.count({ where });
    const mapped = all.map((t) => mapWasteTripForClient(t, mappings));
    mapped.sort((a, b) => {
      const av = (a as any)[sort] ?? -Infinity;
      const bv = (b as any)[sort] ?? -Infinity;
      return dir === "asc" ? av - bv : bv - av;
    });
    rows = mapped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const orderBy: Prisma.WasteTripOrderByWithRelationInput = sort
      ? { [sort]: dir === "asc" ? "asc" : "desc" }
      : { receivedDate: "desc" };
    const [dbRows, count] = await Promise.all([
      prisma.wasteTrip.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.wasteTrip.count({ where })
    ]);
    rows = dbRows.map((t) => mapWasteTripForClient(t, mappings));
    total = count;
  }

  const unconfirmedMapping = mappings.some((m) => !m.confirmed);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">
          {section} — {SECTION_LABELS_TH[section]}
        </h1>
        <p className="text-sm text-gray-500">ตารางเที่ยวรับ-บำบัด กรองอัตโนมัติจาก Type Waste ตาม Mapping ในหน้า Settings</p>
      </div>

      {typeWasteValues.length === 0 && (
        <div className="card bg-amber-50 text-amber-800 text-sm">
          ยังไม่มี Type Waste ใดถูก Map เข้าสาย {section} — ไปตั้งค่าได้ที่หน้า Settings &gt; Mapping
        </div>
      )}
      {unconfirmedMapping && (
        <div className="card bg-amber-50 text-amber-800 text-sm">
          ⚠️ สายนี้มี Type Waste ที่ยังไม่ยืนยัน (unconfirmed) — ตัวเลขในหน้านี้อาจไม่ครบถ้วนจนกว่าทีมจะยืนยัน mapping จริงในหน้า Settings
        </div>
      )}

      <WasteTripTable
        section={section}
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        canEdit={can(session.role, "editTrip")}
        canCreate={can(session.role, "createTrip")}
        statusOptions={Object.entries(TRIP_STATUS_LABELS) as [TripStatus, string][]}
      />
    </div>
  );
}
