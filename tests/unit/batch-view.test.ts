import { describe, expect, it } from "vitest";
import { canWriteEventData } from "@/lib/permissions";
import {
  canManageBatchUi,
  isBatchReadable,
  publishedBatchItems,
} from "@/lib/batch-view";

describe("batch view mode", () => {
  it("allows global ADMIN and open EVENT_ADMIN to manage in Edit mode", () => {
    expect(
      canManageBatchUi(canWriteEventData("EVENT_ADMIN", false, true), false),
    ).toBe(true);
    expect(
      canManageBatchUi(canWriteEventData("EVENT_ADMIN", false, false), false),
    ).toBe(true);
  });

  it("makes Preview read-only without changing write authorization", () => {
    const canWrite = canWriteEventData("EVENT_ADMIN", false, false);
    expect(canWrite).toBe(true);
    expect(canManageBatchUi(canWrite, true)).toBe(false);
  });

  it("keeps closed event admins read-only and hides controls from members", () => {
    expect(
      canManageBatchUi(canWriteEventData("EVENT_ADMIN", true, false), false),
    ).toBe(false);
    expect(
      canManageBatchUi(canWriteEventData("MEMBER", false, false), false),
    ).toBe(false);
    expect(
      canManageBatchUi(canWriteEventData("OBSERVER", false, false), false),
    ).toBe(false);
  });

  it("never lets Preview grant write access", () => {
    expect(
      canManageBatchUi(canWriteEventData("MEMBER", false, false), true),
    ).toBe(false);
    expect(canManageBatchUi(false, false)).toBe(false);
  });

  it("exposes only published, non-archived songs and keeps batch order", () => {
    const items = [
      { songId: "draft", song: { isPublished: false, archivedAt: null } },
      { songId: "published", song: { isPublished: true, archivedAt: null } },
      {
        songId: "archived",
        song: { isPublished: true, archivedAt: new Date() },
      },
    ];
    expect(publishedBatchItems(items).map((item) => item.songId)).toEqual([
      "published",
    ]);
  });

  it("hides archived and empty batches from read-only users", () => {
    const published = {
      song: { isPublished: true, archivedAt: null },
    };
    expect(
      isBatchReadable({ status: "PUBLISHED", items: [published] }),
    ).toBe(true);
    expect(
      isBatchReadable({ status: "ARCHIVED", items: [published] }),
    ).toBe(false);
    expect(
      isBatchReadable({
        status: "PUBLISHED",
        items: [{ song: { isPublished: false, archivedAt: null } }],
      }),
    ).toBe(false);
  });
});
