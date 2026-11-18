import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";

const { findSessionUser, getEventRole, prisma } = vi.hoisted(() => ({
  findSessionUser: vi.fn(),
  getEventRole: vi.fn(),
  prisma: {
    event: { findUnique: vi.fn() },
    eventSong: { findUnique: vi.fn() },
    song: { findUnique: vi.fn() },
    songBatch: { findUnique: vi.fn() },
    rehearsal: { findUnique: vi.fn() },
  },
}));

vi.mock("@server/services/session-service", () => ({ findSessionUser }));
vi.mock("@server/services/event-access", () => ({ getEventRole }));
vi.mock("@/lib/db", () => ({ prisma }));

import { proxy } from "@/proxy";
import type { SessionUser } from "@/lib/permissions";

const NATAL = "cmw5u5hnr000008jgmqjalsw9";
const DAMAI = "cmw5uk19g000f08jgki0xyn2s";
const CHART = `/songs/${DAMAI}/chart?eventId=${NATAL}`;

const lorenzo: SessionUser = {
  id: "lorenzo",
  username: "lorenzo",
  displayName: "Lorenzo",
  role: "USER",
  mustChangePassword: false,
};

const admin: SessionUser = {
  ...lorenzo,
  id: "admin",
  role: "ADMIN",
};

function call(path: string, user: SessionUser | null, method = "GET") {
  findSessionUser.mockResolvedValue(user);
  const headers = new Headers();
  if (user) headers.set("cookie", `${SESSION_COOKIE_NAME}=session-token`);
  return proxy(
    new NextRequest(`https://myth.test${path}`, { method, headers }),
  );
}

async function expectPlain404(response: Response) {
  expect(response.status).toBe(404);
  expect(response.headers.get("content-type")).toContain("text/plain");
  expect(await response.text()).toBe("Halaman tidak ditemukan.");
}

function expectPassed(response: Response) {
  expect(response.status).not.toBe(404);
}

describe("proxy chart editor access", () => {
  beforeEach(() => {
    findSessionUser.mockReset();
    getEventRole.mockReset();
    prisma.event.findUnique.mockReset();
    prisma.eventSong.findUnique.mockReset();
    prisma.song.findUnique.mockReset();
    prisma.event.findUnique.mockResolvedValue({ accessClosedAt: null });
    prisma.eventSong.findUnique.mockResolvedValue({ id: "es-1", eventId: NATAL });
    getEventRole.mockResolvedValue("EVENT_ADMIN");
  });

  it("lets an EVENT_ADMIN open the chart for a song on their open event", async () => {
    const response = await call(CHART, lorenzo);

    expectPassed(response);
    expect(prisma.eventSong.findUnique).toHaveBeenCalledWith({
      where: { eventId_songId: { eventId: NATAL, songId: DAMAI } },
      select: { id: true },
    });
    expect(getEventRole).toHaveBeenCalledWith(lorenzo, NATAL);
  });

  it("keeps the arrangement query on the same allowed chart URL", async () => {
    const response = await call(`${CHART}&arrangement=arr-1`, lorenzo);
    expectPassed(response);
  });

  it("blocks MEMBER, OBSERVER, and a non-member with the plain 404", async () => {
    getEventRole.mockResolvedValueOnce("MEMBER");
    await expectPlain404(await call(CHART, lorenzo));

    getEventRole.mockResolvedValueOnce("OBSERVER");
    await expectPlain404(await call(CHART, { ...lorenzo, role: "OBSERVER" }));

    getEventRole.mockResolvedValueOnce(null);
    await expectPlain404(await call(CHART, lorenzo));
  });

  it("blocks a closed event even for its EVENT_ADMIN", async () => {
    prisma.event.findUnique.mockResolvedValue({
      accessClosedAt: new Date("2026-11-09T00:00:00Z"),
    });

    await expectPlain404(await call(CHART, lorenzo));
  });

  it("blocks a song that is not on that event's setlist", async () => {
    prisma.eventSong.findUnique.mockResolvedValue(null);

    await expectPlain404(await call(CHART, lorenzo));
    expect(getEventRole).not.toHaveBeenCalled();
  });

  it("blocks the chart URL when eventId is missing", async () => {
    await expectPlain404(await call(`/songs/${DAMAI}/chart`, lorenzo));
    expect(prisma.eventSong.findUnique).not.toHaveBeenCalled();
  });

  it("does not filter a global ADMIN, including the library chart URL", async () => {
    expectPassed(await call(`/songs/${DAMAI}/chart`, admin));
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
    expect(getEventRole).not.toHaveBeenCalled();
  });

  it("still lets an event admin open the song page for that setlist", async () => {
    const response = await call(`/songs/${DAMAI}?eventId=${NATAL}`, lorenzo);
    expectPassed(response);
  });

  it("lets an event admin open their event brief instead of a blanket 404", async () => {
    expectPassed(await call(`/event/${NATAL}`, lorenzo));
    expect(getEventRole).toHaveBeenCalledWith(lorenzo, NATAL);

    getEventRole.mockResolvedValue(null);
    await expectPlain404(await call(`/event/${NATAL}`, lorenzo));
  });
});
