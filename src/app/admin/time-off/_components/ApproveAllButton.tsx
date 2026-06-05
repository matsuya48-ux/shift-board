"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { approveAllPending } from "../actions";

export function ApproveAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handle() {
    if (!confirm(`申請中 ${count} 件を一括承認しますか？`)) return;
    startTransition(async () => {
      const r = await approveAllPending();
      if (r.ok) {
        setMsg(`${r.count ?? 0} 件を承認しました`);
        router.refresh();
      } else {
        setMsg(r.message ?? "エラーが発生しました");
      }
    });
  }

  if (count === 0) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handle}
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[13px] font-medium text-white shadow-[0_6px_18px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" strokeWidth={2.2} />
        )}
        申請中 {count} 件を一括承認
      </button>
      {msg && (
        <p className="mt-2 text-center text-[11px] text-[color:var(--accent)]">
          {msg}
        </p>
      )}
    </div>
  );
}
