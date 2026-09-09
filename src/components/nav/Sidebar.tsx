"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 bg-navy-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="font-bold text-lg leading-tight">GENCO</div>
        <div className="text-xs text-white/60 leading-tight">Production Waste Management</div>
      </div>
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm ${
                active ? "bg-navy-800 text-white font-medium border-l-4 border-brand-primary" : "text-white/70 hover:bg-navy-800/60"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
