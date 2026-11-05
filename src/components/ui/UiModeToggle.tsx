import { setUiModeAction } from "@server/actions/ui-mode";
import type { UiMode } from "@/lib/ui-mode";

export function UiModeToggle({
  eventId,
  mode,
}: {
  eventId: string;
  mode: UiMode;
}) {
  return (
    <form
      action={setUiModeAction}
      className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <button
        type="submit"
        name="mode"
        value="edit"
        aria-pressed={mode === "edit"}
        className={`h-11 px-3 text-sm font-medium ${
          mode === "edit"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        Edit
      </button>
      <button
        type="submit"
        name="mode"
        value="preview"
        aria-pressed={mode === "preview"}
        className={`h-11 px-3 text-sm font-medium ${
          mode === "preview"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        Preview
      </button>
    </form>
  );
}
