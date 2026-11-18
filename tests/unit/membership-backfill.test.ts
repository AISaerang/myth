import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  eventRoleForGlobalRole,
  membershipApplyIsBlocked,
  planMembershipBackfill,
  selectCurrentRegionalEvent,
  PROD_DB_USER_PREFIX,
  type BackfillEvent,
  type BackfillUser,
} from "@/lib/membership-backfill";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function event(
  partial: Partial<BackfillEvent> & Pick<BackfillEvent, "id" | "name">,
): BackfillEvent {
  return {
    eventType: "REGIONAL",
    eventStatus: "CONFIRMED",
    eventDate: new Date("2026-11-14T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...partial,
  };
}

function user(partial: Partial<BackfillUser> & Pick<BackfillUser, "id" | "username">): BackfillUser {
  return {
    role: "USER",
    isActive: true,
    membershipCount: 0,
    ...partial,
  };
}

const regional = event({
  id: "evt-regional",
  name: "Regional 14 Nov",
  eventDate: new Date("2026-11-14T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
});
const olderRegional = event({
  id: "evt-older",
  name: "Regional lama",
  eventDate: new Date("2026-08-01T00:00:00.000Z"),
});
const cancelledRegional = event({
  id: "evt-cancelled",
  name: "Regional batal",
  eventStatus: "CANCELLED",
  eventDate: new Date("2026-12-20T00:00:00.000Z"),
});
const gehc = event({
  id: "evt-gehc",
  name: "Ibadah GEHC",
  eventType: "INTERNAL_GEHC",
  eventDate: new Date("2026-12-25T00:00:00.000Z"),
  updatedAt: new Date("2026-11-02T00:00:00.000Z"),
});

describe("regional event selection", () => {
  it("picks the newest non-cancelled regional event", () => {
    const selected = selectCurrentRegionalEvent([
      olderRegional,
      gehc,
      cancelledRegional,
      regional,
    ]);
    expect(selected?.id).toBe("evt-regional");
  });

  it("puts an undated regional event behind a dated one", () => {
    const undated = event({
      id: "evt-undated",
      name: "Tanpa tanggal",
      eventDate: null,
      updatedAt: new Date("2026-12-01T00:00:00.000Z"),
    });
    expect(selectCurrentRegionalEvent([undated, olderRegional])?.id).toBe(
      "evt-older",
    );
  });

  it("breaks a date tie with updatedAt, newest first", () => {
    const earlier = event({
      id: "evt-early-update",
      name: "Update lama",
      eventDate: new Date("2026-11-14T00:00:00.000Z"),
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const later = event({
      id: "evt-late-update",
      name: "Update baru",
      eventDate: new Date("2026-11-14T00:00:00.000Z"),
      updatedAt: new Date("2026-11-03T00:00:00.000Z"),
    });
    expect(selectCurrentRegionalEvent([earlier, later])?.id).toBe(
      "evt-late-update",
    );
  });

  it("returns null when every event is GEHC or cancelled", () => {
    expect(selectCurrentRegionalEvent([gehc, cancelledRegional])).toBeNull();
    expect(selectCurrentRegionalEvent([])).toBeNull();
  });
});

describe("membership backfill selection", () => {
  const events = [olderRegional, regional, cancelledRegional, gehc];

  it("adds only active users who have no membership at all", () => {
    const plan = planMembershipBackfill({
      users: [
        user({ id: "u-legacy", username: "legacy", role: "USER" }),
        user({ id: "u-admin", username: "adminlama", role: "ADMIN" }),
        user({ id: "u-observer", username: "pantau", role: "OBSERVER" }),
        user({
          id: "u-gehc",
          username: "gehc-only",
          membershipCount: 1,
        }),
        user({
          id: "u-both",
          username: "sudah-regional",
          membershipCount: 2,
        }),
        user({
          id: "u-inactive",
          username: "nonaktif",
          isActive: false,
        }),
      ],
      events,
    });

    expect(plan.targetEvent?.id).toBe("evt-regional");
    expect(plan.inserts.map((row) => [row.username, row.eventRole, row.eventId])).toEqual([
      ["adminlama", "EVENT_ADMIN", "evt-regional"],
      ["legacy", "MEMBER", "evt-regional"],
      ["pantau", "OBSERVER", "evt-regional"],
    ]);
    expect(plan.skippedMemberCount).toBe(2);
    expect(plan.skippedInactiveCount).toBe(1);
    expect(plan.unassignedActiveCount).toBe(3);
    expect(plan.inserts.some((row) => row.eventId === "evt-gehc")).toBe(false);
    expect(plan.inserts.some((row) => row.username === "gehc-only")).toBe(false);
  });

  it("does not add anyone when there is no regional target", () => {
    const plan = planMembershipBackfill({
      users: [user({ id: "u-legacy", username: "legacy" })],
      events: [gehc, cancelledRegional],
    });
    expect(plan.targetEvent).toBeNull();
    expect(plan.inserts).toEqual([]);
    expect(plan.unassignedActiveCount).toBe(1);
  });

  it("adds nobody on a second pass once those users have a membership", () => {
    const first = planMembershipBackfill({
      users: [
        user({ id: "u-legacy", username: "legacy" }),
        user({ id: "u-gehc", username: "gehc-only", membershipCount: 1 }),
      ],
      events,
    });
    const second = planMembershipBackfill({
      users: [
        user({ id: "u-legacy", username: "legacy", membershipCount: 1 }),
        user({ id: "u-gehc", username: "gehc-only", membershipCount: 1 }),
      ],
      events,
    });
    expect(first.inserts.map((row) => row.username)).toEqual(["legacy"]);
    expect(second.inserts).toEqual([]);
    expect(second.skippedMemberCount).toBe(2);
  });

  it("maps global roles the same way as the original migration", () => {
    expect(eventRoleForGlobalRole("ADMIN")).toBe("EVENT_ADMIN");
    expect(eventRoleForGlobalRole("USER")).toBe("MEMBER");
    expect(eventRoleForGlobalRole("OBSERVER")).toBe("OBSERVER");
  });

  it("still skips an inactive account that already belongs to an event", () => {
    const plan = planMembershipBackfill({
      users: [
        user({
          id: "u-old-gehc",
          username: "gehc-nonaktif",
          isActive: false,
          membershipCount: 1,
        }),
      ],
      events,
    });
    expect(plan.inserts).toEqual([]);
    expect(plan.skippedMemberCount).toBe(1);
    expect(plan.skippedInactiveCount).toBe(0);
  });
});

describe("membership backfill prod guard", () => {
  it("blocks apply for the rGq prefix unless --allow-prod is set", () => {
    expect(PROD_DB_USER_PREFIX).toBe("rGq");
    expect(
      membershipApplyIsBlocked("rGq", { apply: true, allowProd: false }),
    ).toBe(true);
    expect(
      membershipApplyIsBlocked("rGq", { apply: true, allowProd: true }),
    ).toBe(false);
    expect(
      membershipApplyIsBlocked("rGq", { apply: false, allowProd: false }),
    ).toBe(false);
    expect(
      membershipApplyIsBlocked("3EP", { apply: true, allowProd: false }),
    ).toBe(false);
  });
});

describe("account creation does not auto-join an event", () => {
  const sources = [
    "server/services/user-service.ts",
    "server/actions/admin-users.ts",
    "server/services/invite-service.ts",
    "server/services/personnel-service.ts",
    "scripts/bootstrap-admin.ts",
    "scripts/bulk-create-personnel.ts",
    "scripts/onboard-observers.ts",
  ];

  it("never creates an event membership from user or invite flows", () => {
    for (const relativePath of sources) {
      const source = readFileSync(join(root, relativePath), "utf8");
      expect(source, relativePath).not.toMatch(/eventMembership/);
    }
  });
});
