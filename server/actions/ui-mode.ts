"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { canManageEvent, isAdmin } from "@/lib/permissions";
import { UI_MODE_COOKIE, withUiMode, type UiMode } from "@/lib/ui-mode";
import { getAccessibleEvent, getEventRole } from "@server/services/event-access";
import { requireActionUser } from "@/lib/auth";

export async function setUiModeAction(formData: FormData): Promise<void> {
  const user = await requireActionUser();
  const eventId = String(formData.get("eventId") ?? "");
  const mode: UiMode = formData.get("mode") === "preview" ? "preview" : "edit";
  const event = await getAccessibleEvent(user, eventId);
  if (!event) throw new Error("Event tidak tersedia.");
  const role = await getEventRole(user, eventId);
  if (!isAdmin(user) && !canManageEvent(role)) throw new Error("Forbidden");

  const store = await cookies();
  store.set(UI_MODE_COOKIE, withUiMode(store.get(UI_MODE_COOKIE)?.value, eventId, mode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath("/", "layout");
}
