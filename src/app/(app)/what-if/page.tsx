import { WhatIfForm } from "@/components/what-if/WhatIfForm";

export const dynamic = "force-dynamic";

export default function WhatIfPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">What-if Simulation</h1>
        <p className="text-sm text-gray-500">จำลองผลกระทบจากการหยุดรับของเสียของแต่ละสาย ต่อ Target plan ของเดือนนั้นๆ (Rule-based)</p>
      </div>
      <WhatIfForm />
    </div>
  );
}
