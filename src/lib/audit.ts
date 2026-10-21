import "server-only";
import { prisma } from "@/lib/db";

export const AuditAction = {
  USER_CREATED: "USER_CREATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET: "PASSWORD_RESET",
  USER_ACTIVATED: "USER_ACTIVATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  ROLE_CHANGED: "ROLE_CHANGED",
  INVITE_CREATED: "INVITE_CREATED",
  INVITE_REDEEMED: "INVITE_REDEEMED",
  EVENT_CREATED: "EVENT_CREATED",
  EVENT_UPDATED: "EVENT_UPDATED",
  PERSON_CREATED: "PERSON_CREATED",
  PERSON_UPDATED: "PERSON_UPDATED",
  SONG_CREATED: "SONG_CREATED",
  SONG_UPDATED: "SONG_UPDATED",
  SONG_PUBLISHED: "SONG_PUBLISHED",
  VERSION_ACTIVATED: "VERSION_ACTIVATED",
  FINAL_LOCKED: "FINAL_LOCKED",
  FINAL_UNLOCKED: "FINAL_UNLOCKED",
  MATERIAL_ADDED: "MATERIAL_ADDED",
  MATERIAL_ACTIVATED: "MATERIAL_ACTIVATED",
  BATCH_CREATED: "BATCH_CREATED",
  BATCH_UPDATED: "BATCH_UPDATED",
  BATCH_STATUS_CHANGED: "BATCH_STATUS_CHANGED",
  BATCH_DELETED: "BATCH_DELETED",
  ASSIGNMENT_CREATED: "ASSIGNMENT_CREATED",
  ASSIGNMENT_REMOVED: "ASSIGNMENT_REMOVED",
  PROGRESS_CORRECTED: "PROGRESS_CORRECTED",
  REHEARSAL_CREATED: "REHEARSAL_CREATED",
  REHEARSAL_UPDATED: "REHEARSAL_UPDATED",
  REHEARSAL_CANCELLED: "REHEARSAL_CANCELLED",
  EQUIPMENT_CREATED: "EQUIPMENT_CREATED",
  EQUIPMENT_STATUS_CHANGED: "EQUIPMENT_STATUS_CHANGED",
  CHORD_CHART_SAVED: "CHORD_CHART_SAVED",
  CHORD_CHART_UPDATED: "CHORD_CHART_UPDATED",
  CHORD_CHART_ACTIVATED: "CHORD_CHART_ACTIVATED",
  CHART_SECTION_CREATED: "CHART_SECTION_CREATED",
  CHART_SECTION_UPDATED: "CHART_SECTION_UPDATED",
  CHART_SECTION_DELETED: "CHART_SECTION_DELETED",
  CHART_ARRANGEMENT_CREATED: "CHART_ARRANGEMENT_CREATED",
  CHART_ARRANGEMENT_UPDATED: "CHART_ARRANGEMENT_UPDATED",
  CHART_ARRANGEMENT_ITEMS_SAVED: "CHART_ARRANGEMENT_ITEMS_SAVED",
  CHART_ARRANGEMENT_ACTIVATED: "CHART_ARRANGEMENT_ACTIVATED",
  CHART_ARRANGEMENT_DELETED: "CHART_ARRANGEMENT_DELETED",
  CHART_LEGACY_IMPORTED: "CHART_LEGACY_IMPORTED",
  CHART_LYRICS_IMPORTED: "CHART_LYRICS_IMPORTED",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

interface WriteAuditInput {
  actorUserId?: string;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  summary: string;
  // NEVER include secrets, passwords, or tokens here.
  metadata?: Record<string, string>;
}

// Audit failures must never break the primary mutation, but they must
// never fail silently either: log to server stderr for ops visibility.
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("audit-write-failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
  }
}
