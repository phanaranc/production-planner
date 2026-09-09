"use server";

import { requireUser } from "@/lib/current-user";
import { runWhatIfScenario, type WhatIfInput, type WhatIfResult } from "@/lib/what-if";

export async function runWhatIfAction(input: WhatIfInput): Promise<WhatIfResult> {
  await requireUser(); // §4.4 — view permission is enough; every role can explore what-if
  return runWhatIfScenario(input);
}
