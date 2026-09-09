"use client";

import { useRef, useState } from "react";
import { previewWasteTripImportAction, commitWasteTripImportAction, type ImportPreview } from "@/app/(app)/settings/actions";

export function ImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setBusy(true);
    try {
      const p = await previewWasteTripImportAction(text);
      setPreview(p);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!csvText) return;
    setBusy(true);
    try {
      const r = await commitWasteTripImportAction(csvText);
      setResult(`นำเข้าสำเร็จ ${r.created} รายการ`);
      setPreview(null);
      setCsvText(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        นำเข้าไฟล์ CSV รูปแบบเดียวกับ Book1.csv (ตารางรายเที่ยว §2/§7) — ระบบจะตรวจสอบข้อมูลก่อน (dry-run) และแสดงจำนวนแถวที่ถูกต้อง/ผิดพลาด
        ต้องกดยืนยันก่อนจึงจะบันทึกจริง ไม่มีการบันทึกข้อมูลบางส่วนแบบเงียบๆ
      </p>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} disabled={busy} />

      {preview && (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm">
            <span className="text-status-normal">✅ ถูกต้อง {preview.validCount} แถว</span>
            <span className="text-status-urgent">⚠️ ผิดพลาด {preview.errorCount} แถว</span>
          </div>
          {preview.errorCount > 0 && (
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">แถว</th>
                    <th className="text-left p-2">ข้อผิดพลาด</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows
                    .filter((r) => r.errors.length > 0)
                    .map((r) => (
                      <tr key={r.row} className="border-b">
                        <td className="p-2">{r.row}</td>
                        <td className="p-2 text-status-urgent">{r.errors.join(", ")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn-approve" disabled={busy || preview.validCount === 0} onClick={confirmImport}>
            ยืนยันนำเข้า ({preview.validCount} แถว)
          </button>
        </div>
      )}

      {result && <p className="text-sm text-status-normal">{result}</p>}
    </div>
  );
}
