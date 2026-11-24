"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatJakarta } from "@/lib/format";
import {
  shareLinkStatus,
  shareLinkStatusLabel,
  type ShareLinkStatus,
} from "@/lib/share-link";
import {
  createShareLinkAction,
  revokeShareLinkAction,
  type ShareLinkCreateState,
} from "@server/actions/share-links";

interface ShareLinkRowData {
  id: string;
  label: string | null;
  includeDrafts: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
  maxUses: number | null;
  useCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const statusTone: Record<ShareLinkStatus, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  expired: "warning",
  revoked: "danger",
  exhausted: "neutral",
};

export function ShareLinkAdmin({
  eventId,
  links,
}: {
  eventId: string;
  links: ShareLinkRowData[];
}) {
  const [state, formAction, pending] = useActionState<ShareLinkCreateState, FormData>(
    createShareLinkAction,
    { ok: false },
  );
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    if (!state.shareUrl) return;
    try {
      await navigator.clipboard.writeText(state.shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card title={`Tautan event (${links.length})`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tautan khusus event ini. Akun yang membuka tautan otomatis menjadi
          MEMBER event; orang tanpa akun masuk sebagai tamu read-only. Token
          hanya disimpan sebagai hash, jadi URL lengkap hanya ditampilkan saat
          dibuat.
        </p>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Label (opsional)
              <input
                name="label"
                maxLength={80}
                placeholder="cth. Tamu regional"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Kedaluwarsa (WIB, opsional)
              <input
                name="expiresAt"
                type="datetime-local"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Batas pemakaian (opsional)
              <input
                name="maxUses"
                type="number"
                min={1}
                step={1}
                placeholder="cth. 50"
                className={inputClass}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <input
                name="includeDrafts"
                type="checkbox"
                className="h-5 w-5 rounded border-zinc-300 dark:border-zinc-700"
              />
              Sertakan lagu draft internal
            </label>
          </div>
          {!state.ok && state.error ? (
            <Alert tone="danger">{state.error}</Alert>
          ) : null}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Membuat…" : "Buat tautan"}
            </Button>
          </div>
        </form>

        {state.ok && state.shareUrl ? (
          <Alert tone="info" title="Tautan baru — simpan sekarang">
            <div className="flex flex-col gap-2">
              <p className="font-medium">
                Simpan tautan ini sekarang. Sistem tidak dapat menampilkannya
                lagi.
              </p>
              <code className="break-all rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-900">
                {state.shareUrl}
              </code>
              <div>
                <Button type="button" variant="secondary" size="sm" onClick={copyUrl}>
                  {copied ? "Tersalin" : "Salin tautan"}
                </Button>
              </div>
            </div>
          </Alert>
        ) : null}

        {links.length === 0 ? (
          <p className="text-sm text-zinc-500">Belum ada tautan untuk event ini.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((link) => {
              const status = shareLinkStatus(link);
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{link.label || "Tanpa label"}</p>
                    <p className="text-xs text-zinc-500">
                      Dibuat {formatJakarta(link.createdAt)}
                      {link.expiresAt
                        ? ` · Kedaluwarsa ${formatJakarta(link.expiresAt)}`
                        : " · Tanpa kedaluwarsa"}
                      {` · ${link.useCount}/${link.maxUses ?? "∞"} pemakaian`}
                      {link.lastUsedAt
                        ? ` · Terakhir ${formatJakarta(link.lastUsedAt)}`
                        : ""}
                      {link.includeDrafts ? " · Termasuk draft" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[status]}>
                      {shareLinkStatusLabel(status)}
                    </Badge>
                    <RevokeShareLinkButton
                      eventId={eventId}
                      linkId={link.id}
                      disabled={link.revokedAt != null}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function RevokeShareLinkButton({
  eventId,
  linkId,
  disabled,
}: {
  eventId: string;
  linkId: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(revokeShareLinkAction, {
    ok: false,
  });
  return (
    <form action={formAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="linkId" value={linkId} />
      <Button type="submit" variant="danger" size="sm" disabled={disabled || pending}>
        {disabled ? "Ditarik" : pending ? "…" : "Tarik"}
      </Button>
      {!state.ok && state.error ? (
        <span className="block text-xs text-red-700 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
