"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { WasteTripClient } from "@/lib/waste-trip";
import { createWasteTripAction, updateWasteTripAction, type ActionState } from "@/app/(app)/lines/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "กำลังบันทึก..." : label}
    </button>
  );
}

export function WasteTripRowModal({
  open,
  onClose,
  trip,
  defaultTypeWaste
}: {
  open: boolean;
  onClose: () => void;
  trip?: WasteTripClient | null;
  defaultTypeWaste?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = trip ? updateWasteTripAction : createWasteTripAction;
  const [state, formAction] = useFormState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="rounded-xl p-0 w-full max-w-2xl backdrop:bg-black/40"
    >
      <form action={formAction} className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-navy-900">{trip ? "แก้ไขรายการเที่ยว" : "เพิ่มรายการเที่ยวใหม่"}</h2>
        {trip && <input type="hidden" name="id" value={trip.id} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="วันที่รับของเสีย" name="receivedDate" type="date" defaultValue={trip?.receivedDate} required />
          <Field label="ใบกำกับการขนส่งเลขที่" name="transportDocumentNo" defaultValue={trip?.transportDocumentNo} required />
          <Field label="รหัสลูกค้า" name="customerCode" defaultValue={trip?.customerCode} required />
          <Field label="ชื่อลูกค้า" name="customerName" defaultValue={trip?.customerName} required />
          <Field label="Sale Order" name="saleOrder" defaultValue={trip?.saleOrder} required />
          <Field label="Waste Code" name="wasteCode" defaultValue={trip?.wasteCode} required />
          <Field label="Waste Name" name="wasteName" defaultValue={trip?.wasteName} required />
          <Field label="Sale Name" name="saleName" defaultValue={trip?.saleName} required />
          <Field label="Sale Support" name="saleSupport" defaultValue={trip?.saleSupport ?? ""} />
          <Field label="Type Waste" name="typeWasteRaw" defaultValue={trip?.typeWasteRaw ?? defaultTypeWaste} required />
          <Field label="น้ำหนักรับเข้า (ตัน)" name="receivedWeightTon" type="number" step="0.001" defaultValue={trip?.receivedWeightTon} required />
          <Field label="น้ำหนักบำบัด (ตัน)" name="treatedWeightTon" type="number" step="0.001" defaultValue={trip?.treatedWeightTon ?? ""} />
          <Field label="วันที่บำบัดของเสีย" name="treatedDate" type="date" defaultValue={trip?.treatedDate ?? ""} />
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="transportConfirmed" name="transportConfirmed" value="true" defaultChecked={trip?.transportConfirmed} />
            <label htmlFor="transportConfirmed" className="text-sm">บันทึกขนจริง</label>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="offSpec" name="offSpec" value="true" defaultChecked={trip?.offSpec} />
            <label htmlFor="offSpec" className="text-sm">OFF SPEC</label>
          </div>
          <Field label="หมายเหตุ OFF SPEC" name="offSpecNote" defaultValue={trip?.offSpecNote ?? ""} />
          <Field label="Remark" name="remark" defaultValue={trip?.remark ?? ""} />
        </div>

        {state?.error && <p className="text-sm text-status-urgent">{state.error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <SubmitButton label={trip ? "บันทึกการแก้ไข" : "เพิ่มรายการ"} />
        </div>
      </form>
    </dialog>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="label">
        {label}
        {required && <span className="text-status-urgent"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="input w-full"
      />
    </div>
  );
}
