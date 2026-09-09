"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import type { Section } from "@prisma/client";
import type { WasteTripClient } from "@/lib/waste-trip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionBadge } from "@/components/ui/SectionBadge";
import type { TripStatus } from "@/lib/constants";
import { WasteTripRowModal } from "./WasteTripRowModal";
import { quickUpdateWasteTripAction } from "@/app/(app)/lines/actions";

function SortHeader({ label, sortKey }: { label: string; sortKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir") ?? "desc";
  const nextDir = currentSort === sortKey && currentDir === "desc" ? "asc" : "desc";

  return (
    <button
      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-navy-900"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", sortKey);
        params.set("dir", nextDir);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      {label}
      {currentSort === sortKey && <span>{currentDir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}

function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  function applyParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="label">ค้นหา</label>
        <input
          className="input"
          placeholder="เลขที่เอกสาร / ลูกค้า / Waste Code..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyParam("q", q)}
          onBlur={() => applyParam("q", q)}
        />
      </div>
      <div className="space-y-1">
        <label className="label">ตั้งแต่วันที่</label>
        <input type="date" className="input" defaultValue={searchParams.get("from") ?? ""} onChange={(e) => applyParam("from", e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="label">ถึงวันที่</label>
        <input type="date" className="input" defaultValue={searchParams.get("to") ?? ""} onChange={(e) => applyParam("to", e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="label">ลูกค้า</label>
        <input className="input" defaultValue={searchParams.get("customer") ?? ""} onChange={(e) => applyParam("customer", e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="label">สถานะ</label>
        <select className="input" defaultValue={searchParams.get("status") ?? ""} onChange={(e) => applyParam("status", e.target.value)}>
          <option value="">ทั้งหมด</option>
          <option value="AWAITING_TRANSPORT">รอขนส่ง</option>
          <option value="AWAITING_TREATMENT">รอบำบัด</option>
          <option value="TREATED">บำบัดแล้ว</option>
        </select>
      </div>
      {isPending && <span className="text-xs text-gray-400">กำลังโหลด...</span>}
    </div>
  );
}

export function WasteTripTable({
  section,
  rows,
  total,
  page,
  pageSize,
  canEdit,
  canCreate
}: {
  section: Section;
  rows: WasteTripClient[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canCreate: boolean;
  statusOptions: [TripStatus, string][];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modalTrip, setModalTrip] = useState<WasteTripClient | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = useMemo<ColumnDef<WasteTripClient>[]>(
    () => [
      { header: "วันที่รับ", accessorKey: "receivedDate" },
      { header: "เอกสารขนส่ง", accessorKey: "transportDocumentNo" },
      { header: "ลูกค้า", accessorFn: (r) => `${r.customerCode} — ${r.customerName}` },
      { header: "Sale Order", accessorKey: "saleOrder" },
      { header: "Waste Code", accessorKey: "wasteCode" },
      { header: "Waste Name", accessorKey: "wasteName" },
      { header: "น้ำหนักรับเข้า (ตัน)", accessorKey: "receivedWeightTon" },
      { header: "บันทึกขนจริง", accessorKey: "transportConfirmed" },
      { header: "น้ำหนักบำบัด (ตัน)", accessorKey: "treatedWeightTon" },
      { header: "วันที่บำบัด", accessorKey: "treatedDate" },
      { header: "ระยะเวลาบำบัด (วัน)", accessorKey: "treatmentDurationDays" },
      { header: "ส่วนต่างน้ำหนัก (ตัน)", accessorKey: "weightDifferenceTon" },
      { header: "สถานะ", accessorKey: "status" },
      { header: "สาย", accessorKey: "section" },
      { header: "OFF SPEC", accessorKey: "offSpec" }
    ],
    []
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterBar />
        {canCreate && (
          <button
            className="btn-primary shrink-0"
            onClick={() => {
              setModalTrip(null);
              setModalOpen(true);
            }}
          >
            + เพิ่มรายการเที่ยว
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {table.getFlatHeaders().map((h) => (
                <th key={h.id} className="text-left px-2 py-2 whitespace-nowrap">
                  <SortHeader label={flexRender(h.column.columnDef.header, h.getContext()) as string} sortKey={h.column.id} />
                </th>
              ))}
              {canEdit && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const trip = row.original;
              return (
                <tr key={trip.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1.5 whitespace-nowrap">{trip.receivedDate}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{trip.transportDocumentNo}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {trip.customerCode} — {trip.customerName}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{trip.saleOrder}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{trip.wasteCode}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{trip.wasteName}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{trip.receivedWeightTon.toLocaleString("th-TH")}</td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      defaultChecked={trip.transportConfirmed}
                      disabled={!canEdit}
                      onChange={(e) => quickUpdateWasteTripAction({ id: trip.id, transportConfirmed: e.target.checked }).then(() => router.refresh())}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {canEdit ? (
                      <input
                        type="number"
                        step="0.001"
                        className="input w-24 text-right"
                        defaultValue={trip.treatedWeightTon ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          quickUpdateWasteTripAction({ id: trip.id, treatedWeightTon: v }).then(() => router.refresh());
                        }}
                      />
                    ) : (
                      trip.treatedWeightTon?.toLocaleString("th-TH") ?? "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {canEdit ? (
                      <input
                        type="date"
                        className="input"
                        defaultValue={trip.treatedDate ?? ""}
                        onChange={(e) => quickUpdateWasteTripAction({ id: trip.id, treatedDate: e.target.value || null }).then(() => router.refresh())}
                      />
                    ) : (
                      trip.treatedDate ?? "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{trip.treatmentDurationDays ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">{trip.weightDifferenceTon?.toLocaleString("th-TH") ?? "—"}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <StatusBadge status={trip.status} />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <SectionBadge section={trip.sectionConfirmed ? (trip.section as Section) : null} />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{trip.offSpec ? "⚠️" : ""}</td>
                  {canEdit && (
                    <td className="px-2 py-1.5">
                      <button
                        className="text-xs text-brand-primary underline"
                        onClick={() => {
                          setModalTrip(trip);
                          setModalOpen(true);
                        }}
                      >
                        แก้ไข
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="text-center text-gray-400 py-6">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>ทั้งหมด {total.toLocaleString("th-TH")} รายการ</span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            ก่อนหน้า
          </button>
          <span>
            หน้า {page} / {totalPages}
          </span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
            ถัดไป
          </button>
        </div>
      </div>

      <WasteTripRowModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          router.refresh();
        }}
        trip={modalTrip}
      />
    </div>
  );
}
