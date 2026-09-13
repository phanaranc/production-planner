"use client";

import { useRef, useState } from "react";
import {
  previewWasteTripImportAction,
  commitWasteTripImportAction,
  previewExportActualImportAction,
  commitExportActualImportAction,
  type ImportPreview,
  type ExportActualImportPreview
} from "@/app/(app)/settings/actions";

export function ImportTab() {
  return (
    <div className="space-y-8">
      <WasteTripImport />
      <hr />
      <ExportActualImport />
    </div>
  );
}

function WasteTripImport() {
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
      <h3 className="font-semibold text-navy-900">นำเข้าข้อมูลรับเข้า-บำบัด (รายเที่ยว)</h3>
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

function ExportActualImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExportActualImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setBusy(true);
    try {
      const p = await previewExportActualImportAction(text);
      setPreview(p);
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!csvText) return;
    setBusy(true);
    try {
      const r = await commitExportActualImportAction(csvText);
      setResult(`นำเข้าสำเร็จ ${r.created} รายการ${r.skipped > 0 ? ` (ข้าม ${r.skipped} แถวที่ผิดพลาด)` : ""}`);
      setPreview(null);
      setCsvText(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-navy-900">นำเข้าแผนส่งออก (รายการส่งจริง)</h3>
      <p className="text-sm text-gray-500">
        นำเข้าไฟล์ CSV รูปแบบ: วันที่ส่งกาก, วันที่บำบัด, Manifest No., ชื่อลูกค้า, ประเภทกาก, แผนกบำบัด, นน.ส่งออก(ตัน), หมายเหตุ — รายการที่นำเข้า
        จะยังไม่ผูกกับปลายทาง/บล็อกแผนใดในปฏิทิน ต้องไปจับคู่ที่หน้า &quot;แผนส่งออกรายเดือน&quot; ภายหลัง ต้องมีวันที่ส่งกากและ นน.ส่งออก(ตัน) จึงจะนำเข้าได้
        — แถวที่คอลัมน์อื่นว่างแต่หมายเหตุมีตัวเลข (น่าจะเป็นน้ำหนักที่ตกไปอยู่ผิดคอลัมน์ในไฟล์ต้นฉบับ) จะถูกปฏิเสธและต้องแก้ที่ไฟล์ Excel ต้นฉบับก่อน
        ระบบจะไม่เดาและย้ายค่าให้เอง
      </p>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} disabled={busy} />

      {preview && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-status-normal">✅ พร้อมนำเข้า {preview.validCount} แถว</span>
            <span className="text-amber-600">⚠️ ข้อมูลไม่ครบ {preview.warningCount} แถว (ยังนำเข้าได้)</span>
            <span className="text-status-urgent">❌ ผิดพลาด {preview.errorCount} แถว (จะถูกข้าม)</span>
            <span className="text-gray-400">— ข้ามแถวว่าง {preview.skippedBlankCount} แถว</span>
          </div>
          {(preview.errorCount > 0 || preview.warningCount > 0) && (
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">แถว</th>
                    <th className="text-left p-2">ข้อผิดพลาด/คำเตือน</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows
                    .filter((r) => r.errors.length > 0 || r.warnings.length > 0)
                    .map((r) => (
                      <tr key={r.row} className="border-b">
                        <td className="p-2">{r.row}</td>
                        <td className="p-2">
                          {r.errors.length > 0 && <span className="text-status-urgent">{r.errors.join(", ")}</span>}
                          {r.errors.length > 0 && r.warnings.length > 0 && " · "}
                          {r.warnings.length > 0 && <span className="text-amber-600">{r.warnings.join(", ")}</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn-approve" disabled={busy || preview.validCount + preview.warningCount === 0} onClick={confirmImport}>
            ยืนยันนำเข้า ({preview.validCount + preview.warningCount} แถว)
          </button>
        </div>
      )}

      {result && <p className="text-sm text-status-normal">{result}</p>}
    </div>
  );
}
