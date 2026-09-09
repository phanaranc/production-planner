"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TransportCompany } from "@prisma/client";
import { upsertTransportCompanyAction } from "@/app/(app)/settings/actions";

export function TransportCompaniesTab({ companies, canEdit }: { companies: TransportCompany[]; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">บริษัทรถขนส่งที่ใช้งาน (§3.4) — ใช้เลือกต่อเที่ยวส่งออกในปฏิทินแผนส่งออก</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 uppercase">
            <th className="py-2">ชื่อบริษัท</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-1.5">{c.name}</td>
              <td>{c.active ? "ใช้งาน" : "ปิดใช้งาน"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <div className="border-t pt-4 flex gap-2 items-end">
          <div className="space-y-1 flex-1">
            <label className="label">ชื่อบริษัทขนส่ง</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button
            className="btn-primary"
            onClick={() => upsertTransportCompanyAction({ name, active: true }).then(() => { setName(""); router.refresh(); })}
          >
            + เพิ่มบริษัท
          </button>
        </div>
      )}
    </div>
  );
}
