"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-10 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-6 text-[13px] font-medium text-white shadow-[0_6px_18px_-6px_rgba(45,85,69,0.4)]"
    >
      <Printer className="h-4 w-4" strokeWidth={1.8} />
      印刷する
    </button>
  );
}
