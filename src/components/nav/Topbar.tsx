import { ROLE_LABELS_TH } from "@/lib/constants";
import type { SessionPayload } from "@/lib/session";

export function Topbar({ session }: { session: SessionPayload }) {
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-sm text-right">
          <div className="font-medium text-navy-900">{session.name}</div>
          <div className="text-xs text-gray-500">{ROLE_LABELS_TH[session.role] ?? session.role}</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn-secondary text-xs">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </header>
  );
}
