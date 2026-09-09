import { LoginForm } from "./LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next ?? "/dashboard";
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">GENCO Production Waste Management Planner</h1>
          <p className="text-sm text-navy-100/70 mt-1 text-white/70">ระบบวางแผนการผลิต แผนก Production Waste Management</p>
        </div>
        <div className="card">
          <LoginForm next={next} />
          <p className="text-xs text-gray-400 mt-4">
            บัญชีสาธิต: admin / planner / hoo / entry / viewer @ppwm-demo.local — รหัสผ่าน Control321
          </p>
        </div>
      </div>
    </div>
  );
}
