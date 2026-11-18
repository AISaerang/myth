"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { buildDirectMessage } from "@/lib/broadcast-messages";
import { DEFAULT_TEMP_PASSWORD_HELPER } from "@/lib/password-policy";
import { createInviteAction } from "@server/actions/invites";
import type { BroadcastRecipient } from "@server/services/broadcast-service";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? "Disalin!" : label}
    </Button>
  );
}

export function GroupMessageCard({ message }: { message: string }) {
  return (
    <Card title="Pesan grup WA — siap kirim">
      <div className="flex flex-col gap-3">
        <pre className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {message}
        </pre>
        <div>
          <CopyButton text={message} label="Salin pesan grup" />
        </div>
      </div>
    </Card>
  );
}

export function DirectMessageCard({
  recipient,
  appUrl,
  defaultPassword,
}: {
  recipient: BroadcastRecipient;
  appUrl: string;
  defaultPassword: string;
}) {
  const initial = buildDirectMessage({
    displayName: recipient.displayName,
    username: recipient.username,
    appUrl,
    skills: recipient.skills,
    assignmentCount: recipient.assignmentCount,
    isAdmin: recipient.role === "ADMIN",
    isObserver: recipient.role === "OBSERVER",
    passwordPlaceholder: defaultPassword,
  });
  const [message, setMessage] = useState(initial);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitePending, startInvite] = useTransition();

  function handleCreateInvite() {
    setInviteError(null);
    startInvite(() => {
      const formData = new FormData();
      formData.set("userId", recipient.userId);
      void createInviteAction({ ok: false }, formData).then((result) => {
        if (!result.ok) {
          setInviteError(result.error ?? "Gagal membuat link.");
          return;
        }
        const link = result.inviteLink ?? "";
        setMessage((prev) =>
          prev.includes("[LINK UNDANGAN]")
            ? prev.replace("[LINK UNDANGAN]", link)
            : `${prev}\n\nLink undangan: ${link}`,
        );
      });
    });
  }
  return (
    <Card
      title={`${recipient.displayName} — @${recipient.username} (${recipient.assignmentCount} lagu)`}
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {recipient.role}
          {recipient.skills.length > 0
            ? ` · ${recipient.skills.join(", ")}`
            : " · tanpa skill tercatat"}
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={16}
          className="w-full whitespace-pre-wrap rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="flex flex-wrap gap-2">
          <CopyButton text={message} label="Salin pesan" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={invitePending}
            onClick={handleCreateInvite}
          >
            {invitePending ? "Membuat…" : "Buat link undangan"}
          </Button>
        </div>
        {inviteError ? <Alert tone="danger">{inviteError}</Alert> : null}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {DEFAULT_TEMP_PASSWORD_HELPER}
        </p>
      </div>
    </Card>
  );
}
