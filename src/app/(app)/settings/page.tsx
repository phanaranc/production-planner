import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";
import { can } from "@/lib/rbac";
import { MappingTab } from "@/components/settings/MappingTab";
import { DestinationsTab } from "@/components/settings/DestinationsTab";
import { TransportCompaniesTab } from "@/components/settings/TransportCompaniesTab";
import { UsersTab } from "@/components/settings/UsersTab";
import { ImportTab } from "@/components/settings/ImportTab";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "mapping", label: "Mapping Type Waste" },
  { key: "destinations", label: "ปลายทาง" },
  { key: "companies", label: "บริษัทขนส่ง" },
  { key: "users", label: "ผู้ใช้/สิทธิ์" },
  { key: "import", label: "นำเข้าข้อมูล" }
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await requireUser();
  const canEdit = can(session.role, "administer");
  const tab = (searchParams.tab ?? "mapping") as (typeof TABS)[number]["key"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Settings</h1>
        <p className="text-sm text-gray-500">ค่า Config ทั้งหมดในหน้านี้แก้ไขได้โดยไม่ต้องแก้โค้ด ตามหลัก "ห้าม hard-code"</p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/settings?tab=${t.key}`}
            className={`px-4 py-2 text-sm ${tab === t.key ? "border-b-2 border-brand-primary text-navy-900 font-medium" : "text-gray-500"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card">
        {tab === "mapping" && <MappingTab mappings={await prisma.wasteTypeMapping.findMany({ orderBy: { section: "asc" } })} canEdit={canEdit} />}
        {tab === "destinations" && (
          <DestinationsTab destinations={await prisma.destination.findMany({ orderBy: [{ section: "asc" }, { name: "asc" }] })} canEdit={canEdit} />
        )}
        {tab === "companies" && <TransportCompaniesTab companies={await prisma.transportCompany.findMany({ orderBy: { name: "asc" } })} canEdit={canEdit} />}
        {tab === "users" && (
          <UsersTab
            users={await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { createdAt: "asc" } })}
            canEdit={canEdit}
          />
        )}
        {tab === "import" && <ImportTab />}
      </div>
    </div>
  );
}
