"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { updateEvent, deleteEvent } from "@/app/admin/events/actions";

type Event = {
  id: string;
  title: string;
  description?: string | null;
  color: string | null;
  event_date?: string; // 編集時に必要（管理者表示時のみ）
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const COLORS = [
  "#c98579", // sale
  "#5a7d9a", // 荷物
  "#8a5aa8", // AW
  "#a67234", // 商品部
  "#2d5545", // general
  "#9a3e3a", // urgent
];

export function EventPopover({
  date,
  events,
  warehouseName,
  isAdmin = false,
}: {
  date: string;
  events: Event[];
  warehouseName?: string;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const wd = WEEKDAYS[dateObj.getDay()];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-center transition-opacity active:opacity-60"
      >
        {events.map((ev) => (
          <div
            key={ev.id}
            className="mx-auto mb-0.5 truncate rounded px-0.5 text-[8px] font-medium leading-tight text-white"
            style={{ background: ev.color ?? "#c98579" }}
            title={ev.title}
          >
            {ev.title.length > 4
              ? ev.title.slice(0, 4) + "…"
              : ev.title}
          </div>
        ))}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-sm animate-fade sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[color:var(--bg)] p-6 shadow-[var(--shadow-lg)] animate-slide-up sm:rounded-[24px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--accent)]">
                  Events
                </p>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums text-[color:var(--ink)]">
                  {m}/{d} ({wd})
                </h2>
                {warehouseName && (
                  <p className="mt-0.5 text-[11px] text-[color:var(--ink-3)]">
                    {warehouseName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[color:var(--ink-2)] shadow-[var(--shadow-sm)] active:scale-95"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-2">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  date={date}
                  isAdmin={isAdmin}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>

            {isAdmin && (
              <p className="mt-5 text-[11px] leading-relaxed text-[color:var(--ink-3)]">
                ※ 新規イベント追加は <b>管理メニュー → 設定 → イベント</b> から行えます。
              </p>
            )}
          </div>

          <style jsx>{`
            .animate-fade {
              animation: fade 0.2s ease-out;
            }
            .animate-slide-up {
              animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes fade {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function EventCard({
  event,
  date,
  isAdmin,
  onClose,
}: {
  event: Event;
  date: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集中フォームの値
  const [title, setTitle] = useState(event.title);
  const [eventDate, setEventDate] = useState(event.event_date ?? date);
  const [description, setDescription] = useState(event.description ?? "");
  const [color, setColor] = useState(event.color ?? "#c98579");

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await updateEvent(event.id, {
        event_date: eventDate,
        title,
        description,
        color,
      });
      if (r.ok) {
        setEditing(false);
        router.refresh();
        // 日付を変更した場合は元のポップアップを閉じる
        if (eventDate !== date) onClose();
      } else {
        setError(r.message ?? "保存に失敗しました");
      }
    });
  }

  function remove() {
    if (!confirm("このイベントを削除しますか？")) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteEvent(event.id);
      if (r.ok) {
        router.refresh();
        onClose();
      } else {
        setError(r.message ?? "削除に失敗しました");
      }
    });
  }

  if (editing) {
    return (
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              日付
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={12}
              className="h-10 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              詳細（任意）
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
              色
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c
                      ? "scale-110 ring-2 ring-offset-2 ring-[color:var(--ink)]"
                      : ""
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 p-2.5 text-[11px] text-[color:var(--danger)]">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={isPending || !title.trim() || !eventDate}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[12px] font-medium text-white active:scale-95 disabled:bg-[color:var(--ink-4)]"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setTitle(event.title);
              setEventDate(event.event_date ?? date);
              setDescription(event.description ?? "");
              setColor(event.color ?? "#c98579");
              setError(null);
            }}
            disabled={isPending}
            className="h-10 rounded-full bg-[color:var(--bg)] px-4 text-[12px] font-medium text-[color:var(--ink-3)] active:scale-95"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      <div
        className="h-10 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: event.color ?? "#c98579" }}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[14px] font-semibold text-[color:var(--ink)]">
          {event.title}
        </p>
        {event.description && (
          <p className="text-[12px] leading-relaxed text-[color:var(--ink-2)]">
            {event.description}
          </p>
        )}
      </div>
      {isAdmin && (
        <div className="flex flex-shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isPending}
            aria-label="編集"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--ink-2)] active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            aria-label="削除"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--danger)] active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      )}
    </div>
  );
}
