import clsx from "clsx";

const TONE_BG: Record<string, string> = {
  info: "bg-blue-50",
  good: "bg-green-50",
  warn: "bg-amber-50",
  risk: "bg-red-50"
};

export function KpiCard({
  icon,
  label,
  value,
  sub,
  tone = "info"
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "info" | "good" | "warn" | "risk";
}) {
  return (
    <div className={clsx("card", TONE_BG[tone])}>
      <div className="text-xl">{icon}</div>
      <div className="text-2xl font-bold text-navy-900 mt-2">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
