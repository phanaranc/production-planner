import { SECTION_ORDER, SECTION_LABELS_TH } from "@/lib/constants";

export type NavItem = { href: string; label: string; icon: string };

// §4/§5 — exactly the 5 required screens; the 5 line pages count as one nav
// group so the total stays within the spec's sidebar list.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ...SECTION_ORDER.map((s) => ({ href: `/lines/${s}`, label: `${s} — ${SECTION_LABELS_TH[s]}`, icon: "♻️" })),
  { href: "/export-plan", label: "แผนส่งออกรายเดือน", icon: "📅" },
  { href: "/what-if", label: "What-if Simulation", icon: "🧮" },
  { href: "/settings", label: "Settings", icon: "⚙️" }
];
