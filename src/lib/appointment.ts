import { AppointmentStatus } from "@prisma/client";

export const statusLabels = {
  MISSED: "Missed",
  HELD: "Held",
  SOLD: "Sold",
  PENDING: "Pending / Unassigned",
} as const;
export const statusValues = ["MISSED", "HELD", "SOLD", "PENDING"] as const;

export function parseDateInput(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getRange(value: string | null, end = false) {
  if (!value) return null;
  const date = parseDateInput(value);
  if (!date) return null;
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function normalizeStatus(value: string | undefined): AppointmentStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "HELD") return AppointmentStatus.HELD;
  if (normalized === "SOLD") return AppointmentStatus.SOLD;
  if (!normalized || normalized === "-" || normalized === "N/A")
    return AppointmentStatus.PENDING;
  return AppointmentStatus.MISSED;
}
