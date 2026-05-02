"use client";

import { useState } from "react";
import { TentativeShiftModal } from "./TentativeShiftModal";

/**
 * 月表の△セル。管理者ならタップで TentativeShiftModal を開く。
 * 一般スタッフは見るだけ（titleでメモを表示）。
 */
export function TentativeShiftCell({
  shiftId,
  staffName,
  workDate,
  note,
  isAdmin,
}: {
  shiftId: string;
  staffName: string;
  workDate: string;
  note: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isAdmin) {
    return (
      <span
        className="text-[14px] font-semibold text-[color:var(--ink-3)]"
        title={note ?? "予備"}
      >
        △
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[14px] font-semibold text-[color:var(--ink-3)] active:opacity-60"
        title={note ?? "予備"}
      >
        △
      </button>
      {open && (
        <TentativeShiftModal
          shiftId={shiftId}
          staffName={staffName}
          workDate={workDate}
          note={note}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
