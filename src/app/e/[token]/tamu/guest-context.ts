import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SHARE_GUEST_COOKIE_NAME } from "@/lib/share-cookie";
import {
  findShareLinkIdByToken,
  resolveGuestSession,
  type GuestSessionResolution,
} from "@server/services/share-link-service";

// Guest chrome and pages run in parallel. cache() loads the session once per
// request and binds it to the token in the current /e/{token}/tamu path so a
// cookie for one event can never render another event's guest page.
export const loadGuestContext = cache(
  async (routeToken: string): Promise<GuestSessionResolution> => {
    const rawToken = (await cookies()).get(SHARE_GUEST_COOKIE_NAME)?.value;
    if (!rawToken) return { ok: false, reason: "session" };
    const guest = await resolveGuestSession(rawToken);
    if (!guest.ok) return guest;
    const routeLinkId = await findShareLinkIdByToken(routeToken);
    if (!routeLinkId || routeLinkId !== guest.context.link.id) {
      return { ok: false, reason: "session" };
    }
    return guest;
  },
);
