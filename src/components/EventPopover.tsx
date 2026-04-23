"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Event = {
  id: string;
  title: string;
  description?: string | null;
  color: string | null;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function EventPopover({
  date,
  events,
  warehouseName,
}: {
  date: string;
  events: Event[];
  warehouseName?: string;
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
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]"
                >
                  <div
                    className="h-10 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: ev.color ?? "#c98579" }}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[14px] font-semibold text-[color:var(--ink)]">
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p className="text-[12px] leading-relaxed text-[color:var(--ink-2)]">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
