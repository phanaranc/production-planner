"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1">
        <label className="label">อีเมล</label>
        <input name="email" type="email" required className="input w-full" placeholder="admin@ppwm.local" />
      </div>
      <div className="space-y-1">
        <label className="label">รหัสผ่าน</label>
        <input name="password" type="password" required className="input w-full" />
      </div>
      {state?.error && <p className="text-sm text-status-urgent">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
