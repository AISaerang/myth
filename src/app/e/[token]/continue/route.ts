import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ACTIVE_EVENT_COOKIE } from "@/lib/event-context";
import { SHARE_GUEST_COOKIE_NAME } from "@/lib/share-cookie";
import { isShareTokenShape } from "@/lib/share-token";
import {
  ensureShareLinkMembership,
  recordShareLinkUse,
  resolveShareLinkGuarded,
} from "@server/services/share-link-service";

function landingUrl(request: NextRequest, token: string): URL {
  return new URL(`/e/${encodeURIComponent(token)}`, request.url);
}

// Logged-in resolution for /e/{token}. Kept in a Route Handler because it
// must set the active-event cookie and write membership before redirecting.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const user = await getSessionUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `/e/${token}`);
    return NextResponse.redirect(login);
  }
  if (user.mustChangePassword) {
    const change = new URL("/change-password", request.url);
    change.searchParams.set("callbackUrl", `/e/${token}`);
    return NextResponse.redirect(change);
  }
  if (!isShareTokenShape(token)) {
    return NextResponse.redirect(landingUrl(request, token));
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const resolved = await resolveShareLinkGuarded(token, ip);
  if (!resolved.ok) {
    return NextResponse.redirect(landingUrl(request, token));
  }

  await ensureShareLinkMembership(user.id, resolved.link);
  await recordShareLinkUse(resolved.link.id);

  const response = NextResponse.redirect(
    new URL(`/event/${resolved.link.eventId}`, request.url),
  );
  response.cookies.set(ACTIVE_EVENT_COOKIE, resolved.link.eventId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  // A successful account login takes over from guest mode.
  response.cookies.delete(SHARE_GUEST_COOKIE_NAME);
  return response;
}
