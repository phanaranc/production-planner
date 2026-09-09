"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSignOffAction } from "@/app/(app)/export-plan/actions";

type MonthRecord = {
  id: string;
  preparedByName: string | null;
  preparedAt: Date | null;
  receivedByName: string | null;
  receivedAt: Date | null;
  trackedByName: string | null;
  trackedAt: Date | null;
};

const ROLES: { key: "prepared" | "received" | "tracked"; label: string }[] = [
  { key: "prepared", label: "ผู้จัดทำ" },
  { key: "received", label: "ผู้รับแผนงาน" },
  { key: "tracked", label: "ผู้ติดตามแผนงาน" }
];

export function SignOffForm({ monthId, monthRecord, canSignOff }: { monthId: string; monthRecord: MonthRecord; canSignOff: boolean }) {
  const router = useRouter();
  const [names, setNames] = useState({ prepared: "", received: "", tracked: "" });

  return (
    <div className="card">
      <h3 className="font-bold text-navy-900 mb-3">เซ็นอนุมัติ (3 ตำแหน่ง)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map(({ key, label }) => {
          const nameField = `${key}ByName` as keyof MonthRecord;
          const atField = `${key}At` as keyof MonthRecord;
          const signedName = monthRecord[nameField] as string | null;
          const signedAt = monthRecord[atField] as Date | null;
          return (
            <div key={key} className="border rounded-lg p-3 space-y-2">
              <div className="font-semibold text-sm">{label}</div>
              {signedName ? (
                <div className="text-sm text-status-normal">
                  ✅ {signedName}
                  <div className="text-xs text-gray-400">{signedAt ? new Date(signedAt).toLocaleString("th-TH") : ""}</div>
                </div>
              ) : canSignOff ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="ชื่อผู้เซ็น"
                    value={names[key]}
                    onChange={(e) => setNames((n) => ({ ...n, [key]: e.target.value }))}
                  />
                  <button
                    className="btn-approve text-xs"
                    onClick={() =>
                      saveSignOffAction({ monthId, role: key, name: names[key] || "—" }).then(() => router.refresh())
                    }
                  >
                    เซ็น
                  </button>
                </div>
              ) : (
                <div className="text-xs text-gray-400">ยังไม่ได้เซ็น</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
