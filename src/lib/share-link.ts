// Pure validity rules for a dedicated event share link. Kept free of
// server-only imports so both server services and the admin UI can use it.

export type ShareLinkInvalidReason =
  | "unknown"
  | "expired"
  | "revoked"
  | "max-uses"
  | "cancelled"
  | "closed";

export interface ShareLinkValidityLink {
  expiresAt: Date | null;
  revokedAt: Date | null;
  maxUses: number | null;
  useCount: number;
}

export interface ShareLinkValidityEvent {
  eventStatus: string;
  accessClosedAt: Date | null;
}

export type ShareLinkValidity =
  | { ok: true }
  | { ok: false; reason: ShareLinkInvalidReason };

// Order matters: never reveal the event name for an unknown token, and a
// revoked link fails even if it would also be expired.
export function evaluateShareLink(input: {
  link: ShareLinkValidityLink | null;
  event: ShareLinkValidityEvent | null;
  now?: Date;
}): ShareLinkValidity {
  const now = input.now ?? new Date();
  const link = input.link;
  if (!link) return { ok: false, reason: "unknown" };
  if (link.revokedAt) return { ok: false, reason: "revoked" };
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (link.maxUses != null && link.useCount >= link.maxUses) {
    return { ok: false, reason: "max-uses" };
  }
  if (!input.event) return { ok: false, reason: "unknown" };
  if (input.event.eventStatus === "CANCELLED") {
    return { ok: false, reason: "cancelled" };
  }
  if (input.event.accessClosedAt) return { ok: false, reason: "closed" };
  return { ok: true };
}

export function shareLinkErrorMessage(reason: ShareLinkInvalidReason): string {
  switch (reason) {
    case "expired":
      return "Link ini sudah kedaluwarsa. Minta tautan baru ke admin.";
    case "revoked":
      return "Link ini sudah dinonaktifkan. Minta tautan baru ke admin.";
    case "max-uses":
      return "Link ini sudah mencapai batas pemakaian.";
    case "cancelled":
      return "Event ini dibatalkan.";
    case "closed":
      return "Akses event ini sudah ditutup.";
    case "unknown":
    default:
      return "Link tidak valid.";
  }
}

export const SHARE_THROTTLE_MESSAGE =
  "Terlalu banyak percobaan. Coba lagi beberapa menit.";

export type ShareLinkStatus = "active" | "expired" | "revoked" | "exhausted";

export function shareLinkStatus(
  link: ShareLinkValidityLink,
  now: Date = new Date(),
): ShareLinkStatus {
  if (link.revokedAt) return "revoked";
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }
  if (link.maxUses != null && link.useCount >= link.maxUses) {
    return "exhausted";
  }
  return "active";
}

export function shareLinkStatusLabel(status: ShareLinkStatus): string {
  switch (status) {
    case "expired":
      return "Kedaluwarsa";
    case "revoked":
      return "Ditarik";
    case "exhausted":
      return "Batas pemakaian";
    case "active":
    default:
      return "Aktif";
  }
}

// A guest may read a setlist song only when it is not archived, and only a
// draft when the link explicitly includes internal drafts.
export function canGuestReadSong(
  song: { isPublished: boolean; archivedAt?: Date | null },
  includeDrafts: boolean,
): boolean {
  if (song.archivedAt) return false;
  return includeDrafts || song.isPublished;
}
