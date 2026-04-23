"use client";

import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";

type Staff = {
  id: string;
  display_name: string;
  warehouses: { name: string } | null;
};

export function UnsubmittedStaffList({
  staffs,
  monthLabel,
}: {
  staffs: Staff[];
  monthLabel: string;
}) {
  const [open, setOpen] = useState(false);

  if (staffs.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[color:var(--accent-soft)] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-white text-[12px] font-semibold">
          ✓
        </div>
        <p className="text-[13px] font-semibold text-[color:var(--accent)]">
          {monthLabel}分は全員提出済みです
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[color:var(--warning)]/30 bg-[#fdf5e6] shadow-[var(--shadow-sm)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--warning)] text-white">
          <AlertCircle className="h-4 w-4" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[color:var(--ink)]">
            {monthLabel}分 未提出 {staffs.length} 名
          </p>
          <p className="text-[11px] text-[color:var(--ink-2)]">
            タップで一覧表示
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-[color:var(--ink-3)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="border-t border-[color:var(--warning)]/30 bg-white p-4">
          <ul className="space-y-1.5">
            {staffs.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-[color:var(--bg)] px-3 py-2"
              >
                <span className="text-[13px] font-medium text-[color:var(--ink)]">
                  {s.display_name}
                </span>
                <span className="text-[10px] text-[color:var(--ink-3)]">
                  {s.warehouses?.name ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
