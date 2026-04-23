"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteEvent } from "../actions";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type EventRow = {
  id: string;
  warehouse_id: string;
  event_date: string;
  title: string;
  description: string | null;
  color: string | null;
  warehouses: { name: string } | null;
};

export function EventList({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[13px] text-[color:var(--ink-3)]">
          イベントはまだ登録されていません
        </p>
      </div>
    );
  }

  function handleDelete(id: string) {
    if (!confirm("このイベントを削除しますか？")) return;
    startTransition(async () => {
      await deleteEvent(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {events.map((e) => {
        const d = new Date(`${e.event_date}T00:00:00`);
        const mon = d.getMonth() + 1;
        const day = d.getDate();
        const wd = WEEKDAYS[d.getDay()];
        return (
          <div
            key={e.id}
            className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div
              className="h-10 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: e.color ?? "#c98579" }}
            />
            <div className="flex h-12 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--bg)]">
              <span className="text-[10px] text-[color:var(--ink-3)]">
                {mon}月
              </span>
              <span className="text-[18px] font-semibold leading-none tabular-nums text-[color:var(--ink)]">
                {day}
              </span>
              <span className="text-[9px] text-[color:var(--ink-3)]">
                {wd}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
                {e.title}
              </p>
              <p className="truncate text-[11px] text-[color:var(--ink-3)]">
                {e.warehouses?.name ?? "—"}
                {e.description && (
                  <>
                    <span className="mx-1.5">・</span>
                    {e.description}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(e.id)}
              disabled={isPending}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--ink-3)] transition-colors hover:bg-red-50 hover:text-[color:var(--danger)] disabled:opacity-50"
              aria-label="削除"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
