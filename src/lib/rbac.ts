import type { Role } from "@prisma/client";

export type Permission =
  | "view"
  | "createTrip"
  | "editTrip"
  | "editExportPlan"
  | "signOff"
  | "administer"; // Settings: mapping, destinations, transport companies, users

// Server-enforced permission matrix (spec §6/§8: "แยกสิทธิ์ผู้ใช้... ตามหลัก
// Recommend ไม่ใช่ Command"). Every Server Action re-checks this — never
// just hidden in the UI. HEAD_OF_OPERATION is the final approver (signOff)
// but does not edit day-to-day trip data itself, matching "Planner enters,
// Head of Operation approves."
const MATRIX: Record<Role, Permission[]> = {
  ADMIN: ["view", "createTrip", "editTrip", "editExportPlan", "signOff", "administer"],
  PLANNER: ["view", "createTrip", "editTrip", "editExportPlan"],
  HEAD_OF_OPERATION: ["view", "signOff"],
  DATA_ENTRY: ["view", "createTrip", "editTrip"],
  VIEWER: ["view"]
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function assertCan(role: Role, permission: Permission) {
  if (!can(role, permission)) {
    const err = new Error(`Role ${role} lacks permission '${permission}'`);
    (err as any).status = 403;
    throw err;
  }
}
