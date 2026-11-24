"use client";

import { useEffect } from "react";
import { clearGuestCookieAction } from "@server/actions/share-links";

// Invalid guest sessions cannot be cleared from a Server Component render.
// This runs after the friendly error is shown so a stale cookie is discarded.
export function GuestSessionCleanup() {
  useEffect(() => {
    void clearGuestCookieAction().catch(() => {});
  }, []);
  return null;
}
