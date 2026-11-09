import { NextResponse, type NextRequest } from "next/server";
import { decideSongEdit, isAdmin, type SessionUser } from "@/lib/permissions";
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

// Chart editor is not a read page. Non-admins reach it only with an
// eventId for an open event they administer, and only when that song is
// on the setlist. Missing eventId, another event, MEMBER, OBSERVER, and
// a closed event stay a plain 404 here, before the page runs.
async function allowChartEditor(
  user: SessionUser,
  songId: string,
  eventId: string | null,
): Promise<boolean> {
  if (!eventId) return false;
  const [eventSong, event] = await Promise.all([
    prisma.eventSong.findUnique({
      where: { eventId_songId: { eventId, songId } },
      select: { id: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { accessClosedAt: true },
    }),
  ]);
  const eventRole =
    eventSong && event ? await getEventRole(user, eventId) : null;
  return decideSongEdit({
    globalAdmin: false,
    eventRole,
    accessClosed: Boolean(event?.accessClosedAt),
    eventId,
    songLinkedToEvent: Boolean(eventSong && event),
  }).ok;
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
    eventId = segments[1];
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
    const requestedEventId =
      request.nextUrl.searchParams.get("eventId")?.trim() || null;
    const allowed = await allowChartEditor(
      user,
      segments[1],
      requestedEventId,
    );
    if (!allowed) return notFound();
    return NextResponse.next();
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
