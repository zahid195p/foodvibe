import type { OrderStatus } from "./types";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for pickup",
  rider_assigned: "Rider on the way",
  picked_up: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refund_requested: "Refund requested",
};

// Position of each status along the happy path; terminal/bad states are -1.
export const STATUS_ORDER: Record<OrderStatus, number> = {
  placed: 0,
  accepted: 1,
  preparing: 1,
  ready: 2,
  rider_assigned: 3,
  picked_up: 4,
  delivered: 5,
  rejected: -1,
  cancelled: -1,
  refund_requested: -1,
};

export const TIMELINE_STEPS = [
  "Placed",
  "Accepted",
  "Ready",
  "Rider assigned",
  "Out for delivery",
  "Delivered",
];

export function statusColor(status: OrderStatus): string {
  if (status === "delivered") return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  if (status === "rejected" || status === "cancelled" || status === "refund_requested")
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}
