import type { Section } from "@prisma/client";
import { SECTION_BADGE_CLASS, SECTION_LABELS_TH } from "@/lib/constants";

export function SectionBadge({ section }: { section: Section | null }) {
  if (!section) {
    return (
      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
        ไม่พบ Mapping
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SECTION_BADGE_CLASS[section]}`}>
      {section} · {SECTION_LABELS_TH[section]}
    </span>
  );
}
