import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/permissions";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";
import { getEventRole } from "@server/services/event-access";
import { findSessionUser } from "@server/services/session-service";
import { prisma } from "@/lib/db";

function notFound(): NextResponse {
  return new NextResponse("Halaman tidak ditemukan.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function proxy(request: NextRequest) {
  if (request.method !== "GET") return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.next();

  const user = await findSessionUser(token);
  if (!user || isAdmin(user)) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  let eventId: string | null | undefined;

  if (pathname === "/event" && request.nextUrl.searchParams.has("eventId")) {
    eventId = request.nextUrl.searchParams.get("eventId");
  } else if (
    ["/songs", "/batches", "/rehearsals", "/tasks", "/equipment", "/decisions"].includes(
      pathname,
    ) &&
    request.nextUrl.searchParams.has("eventId")
  ) {
    eventId = request.nextUrl.searchParams.get("eventId");
  } else if (segments.length === 2 && segments[0] === "event") {
    return notFound();
  } else if (
    segments.length === 2 &&
    segments[0] === "songs"
  ) {
    const requestedEventId = request.nextUrl.searchParams.get("eventId");
    if (requestedEventId) {
      const eventSong = await prisma.eventSong.findUnique({
        where: {
          eventId_songId: {
            eventId: requestedEventId,
            songId: segments[1],
          },
        },
        select: { eventId: true },
      });
      eventId = eventSong?.eventId ?? null;
    } else {
      const song = await prisma.song.findUnique({
        where: { id: segments[1] },
        select: { eventId: true },
      });
      eventId = song?.eventId ?? null;
    }
  } else if (
    segments.length === 3 &&
    segments[0] === "songs" &&
    segments[2] === "chart"
  ) {
    return notFound();
  } else if (segments.length === 2 && segments[0] === "batches") {
    const batch = await prisma.songBatch.findUnique({
      where: { id: segments[1] },
      select: { eventId: true },
    });
    eventId = batch?.eventId ?? null;
  } else if (segments.length === 2 && segments[0] === "rehearsals") {
    const rehearsal = await prisma.rehearsal.findUnique({
      where: { id: segments[1] },
      select: { eventId: true },
    });
    eventId = rehearsal?.eventId ?? null;
  }

  if (eventId === undefined) return NextResponse.next();
  if (!eventId || !(await getEventRole(user, eventId))) return notFound();
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/event/:path*",
    "/songs/:path*",
    "/batches/:path*",
    "/rehearsals/:path*",
    "/tasks/:path*",
    "/equipment/:path*",
    "/decisions/:path*",
  ],
};
