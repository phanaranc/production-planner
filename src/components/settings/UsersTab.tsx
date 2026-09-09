"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { ROLE_LABELS_TH } from "@/lib/constants";
import { upsertUserAction } from "@/app/(app)/settings/actions";

const ROLES: Role[] = ["ADMIN", "PLANNER", "HEAD_OF_OPERATION", "DATA_ENTRY", "VIEWER"];

export function UsersTab({ users, canEdit }: { users: Pick<User, "id" | "name" | "email" | "role" | "active">[]; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", role: "VIEWER" as Role, password: "" });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        ผู้ใช้/สิทธิ์อนุมัติ (§6/§8) — "Planner" กรอกข้อมูล, "Head of Operation" เป็นผู้อนุมัติขั้นสุดท้าย ตามหลัก Recommend ไม่ใช่ Command
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 uppercase">
            <th className="py-2">ชื่อ</th>
            <th>อีเมล</th>
            <th>บทบาท</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-1.5">{u.name}</td>
              <td>{u.email}</td>
              <td>{ROLE_LABELS_TH[u.role]}</td>
              <td>{u.active ? "ใช้งาน" : "ระงับ"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="space-y-1">
            <label className="label">ชื่อ</label>
            <input className="input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="label">อีเมล</label>
            <input className="input w-full" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="label">บทบาท</label>
            <select className="input w-full" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS_TH[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">รหัสผ่านตั้งต้น</label>
            <input className="input w-full" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Control321" />
          </div>
          <button
            className="btn-primary"
            onClick={() => upsertUserAction({ ...form, active: true }).then(() => { setForm({ name: "", email: "", role: "VIEWER", password: "" }); router.refresh(); })}
          >
            + เพิ่มผู้ใช้
          </button>
        </div>
      )}
    </div>
  );
}
