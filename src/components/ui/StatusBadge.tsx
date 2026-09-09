import { STATUS_BADGE_CLASS, TRIP_STATUS_LABELS, type TripStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}>
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}
