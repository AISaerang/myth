import type {
  AttendanceStatus,
  DecisionType,
  EquipmentStatus,
  RehearsalStatus,
  RehearsalType,
} from "@/generated/prisma/client";

export const REHEARSAL_TYPE_LABEL: Record<RehearsalType, string> = {
  ONLINE_MONITORING: "Monitoring online",
  ONSITE_SECTIONAL: "Sectional onsite",
  FULL_REHEARSAL: "Full rehearsal",
  TECHNICAL_REHEARSAL: "Gladi bersih",
  EVENT_DAY_SOUNDCHECK: "Soundcheck hari-H",
  OTHER: "Lainnya",
};

export const REHEARSAL_STATUS_LABEL: Record<RehearsalStatus, string> = {
  SCHEDULED: "Terjadwal",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  RESCHEDULED: "Dijadwal ulang",
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  EXPECTED: "Diharapkan",
  PRESENT: "Hadir",
  ABSENT: "Absen",
  LATE: "Terlambat",
  EXCUSED: "Izin",
};

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  NOT_CHECKED: "Belum dicek",
  NEEDED: "Dibutuhkan",
  CONFIRMED: "Terkonfirmasi",
  TESTED: "Teruji",
  BLOCKED: "Blocked",
  NOT_APPLICABLE: "N/A",
};

export const DECISION_TYPE_LABEL: Record<DecisionType, string> = {
  MUSICAL: "Musikal",
  EVENT: "Acara",
  TECHNICAL: "Teknis",
  PERSONNEL: "Personel",
  OTHER: "Lainnya",
};

// Rehearsal yang dibatalkan tidak tampil di daftar upcoming (docs/10).
export function isUpcomingRehearsal(
  status: RehearsalStatus,
  startsAt: Date | string,
  now: Date = new Date(),
): boolean {
  if (status === "CANCELLED" || status === "COMPLETED") return false;
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  return start.getTime() >= now.getTime();
}
