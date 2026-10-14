"use client";

export function EventPicker({
  events,
  value,
}: {
  events: { id: string; name: string }[];
  value: string;
}) {
  return (
    <form method="get" className="flex items-center gap-2 text-sm">
      <label htmlFor="eventId">Event:</label>
      <select
        id="eventId"
        name="eventId"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </form>
  );
}
