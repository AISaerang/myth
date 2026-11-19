"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ARRANGEMENT_ROLE_CATALOG } from "@/lib/arrangement-roles";
import { saveArrangementRoleTabAction } from "@server/actions/chart-arrangements";
import type { ActionState } from "@server/actions/auth";

interface RoleTabRow {
  role: string;
  data: unknown;
}

interface SectionRow {
  id: string;
  label: string;
  content: string;
}

export function ArrangementRoleTabEditor({
  songId,
  arrangementId,
  eventId,
  sections,
  initialTabs,
}: {
  songId: string;
  arrangementId: string;
  eventId?: string;
  sections: SectionRow[];
  initialTabs: RoleTabRow[];
}) {
  const router = useRouter();
  const initialByRole = useMemo(
    () =>
      Object.fromEntries(
        ARRANGEMENT_ROLE_CATALOG.map((role) => {
          const row = initialTabs.find((tab) => tab.role === role.slug);
          return [
            role.slug,
            row?.data && typeof row.data === "object"
              ? ((row.data as { sections?: Record<string, Record<string, string>> }).sections ?? {})
              : {},
          ];
        }),
      ) as Record<string, Record<string, Record<string, string>>>,
    [initialTabs],
  );
  const [sectionsByRole, setSectionsByRole] = useState(initialByRole);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveArrangementRoleTabAction,
    { ok: false },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  function updateField(
    role: string,
    sectionId: string,
    field: "notes" | "pattern" | "dynamic" | "content",
    value: string,
  ) {
    setSectionsByRole((current) => ({
      ...current,
      [role]: {
        ...(current[role] ?? {}),
        [sectionId]: {
          ...(current[role]?.[sectionId] ?? {}),
          [field]: value,
        },
      },
    }));
  }

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="text-lg font-semibold">Tab peran</h2>
        <p className="text-sm text-zinc-500">
          Isi konten khusus aransemen. Tab kosong tidak ditampilkan kepada pemusik.
        </p>
      </div>
      {ARRANGEMENT_ROLE_CATALOG.map((role) => (
        <form key={role.slug} action={formAction} className="flex flex-col gap-3 border-t pt-3">
          <input type="hidden" name="songId" value={songId} />
          <input type="hidden" name="arrangementId" value={arrangementId} />
          {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
          <input type="hidden" name="role" value={role.slug} />
          <input
            type="hidden"
            name="data"
            value={JSON.stringify({ sections: sectionsByRole[role.slug] ?? {} })}
          />
          <h3 className="font-semibold">{role.label}</h3>
          {sections.map((section) => {
            const value = sectionsByRole[role.slug]?.[section.id] ?? {};
            return (
              <fieldset key={section.id} className="grid gap-2 rounded-lg border p-3">
                <legend className="px-1 text-xs font-semibold">{section.label}</legend>
                <label className="flex flex-col gap-1 text-sm">
                  Catatan bagian
                  <textarea
                    className="min-h-20 rounded-lg border px-3 py-2"
                    maxLength={5000}
                    value={value.notes ?? ""}
                    onChange={(event) =>
                      updateField(role.slug, section.id, "notes", event.target.value)
                    }
                  />
                </label>
                {role.slug === "drum" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      Pola drum
                      <input
                        className="h-11 rounded-lg border px-3"
                        maxLength={80}
                        value={value.pattern ?? ""}
                        onChange={(event) =>
                          updateField(role.slug, section.id, "pattern", event.target.value)
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Dinamika
                      <input
                        className="h-11 rounded-lg border px-3"
                        maxLength={16}
                        value={value.dynamic ?? ""}
                        onChange={(event) =>
                          updateField(role.slug, section.id, "dynamic", event.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}
                {role.slug === "guitar_lead" ? (
                  <label className="flex flex-col gap-1 text-sm">
                    Konten Gitar Lead
                    <textarea
                      className="min-h-24 rounded-lg border px-3 py-2 font-mono"
                      maxLength={20000}
                      value={value.content ?? ""}
                      onChange={(event) =>
                        updateField(role.slug, section.id, "content", event.target.value)
                      }
                    />
                  </label>
                ) : null}
              </fieldset>
            );
          })}
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              Simpan {role.label}
            </Button>
          </div>
        </form>
      ))}
    </section>
  );
}
