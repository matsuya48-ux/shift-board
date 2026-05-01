"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Check, Loader2, RotateCcw } from "lucide-react";
import { markNoTimeOff, unmarkNoTimeOff } from "../actions";

type Props = {
  cycleMonth: string; // YYYY-MM
  cycleLabel: string; // 例: "6月度"
  initialMarked: boolean;
  hasAnyRequest: boolean;
};

export function NoRequestSwitch({
  cycleMonth,
  cycleLabel,
  initialMarked,
  hasAnyRequest,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [marked, setMarked] = useState(initialMarked);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function mark() {
    setMessage(null);
    if (
      !confirm(
        `${cycleLabel}は希望休なしとして登録します。よろしいですか？\n（後から取り消し可能です）`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await markNoTimeOff(cycleMonth);
      if (r.ok) {
        setMarked(true);
        setMessage({ type: "success", text: "希望休なしを登録しました" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: r.message ?? "登録に失敗しました" });
      }
    });
  }

  function unmark() {
    setMessage(null);
    startTransition(async () => {
      const r = await unmarkNoTimeOff(cycleMonth);
      if (r.ok) {
        setMarked(false);
        setMessage({ type: "success", text: "「希望休なし」を取り消しました" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: r.message ?? "取消に失敗しました" });
      }
    });
  }

  if (marked) {
    return (
      <div className="rounded-3xl border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-white">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[color:var(--ink)]">
              {cycleLabel}は希望休なしで登録済み
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--ink-2)]">
              管理者の未提出リストには表示されません。気が変わったら下のボタンで取り消せます。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={unmark}
          disabled={isPending}
          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[12px] font-medium text-[color:var(--ink-2)] shadow-[var(--shadow-sm)] active:scale-95 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          「希望休なし」を取り消す
        </button>
        {message && (
          <p
            className={`mt-3 rounded-xl p-2.5 text-[11px] ${
              message.type === "success"
                ? "bg-white text-[color:var(--accent)]"
                : "bg-red-50 text-[color:var(--danger)]"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-[color:var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--ink-2)]">
          <CalendarX className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[color:var(--ink)]">
            {cycleLabel}は休み希望なし
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--ink-3)]">
            今回のサイクルで希望休がない場合は、こちらを登録してください。管理者から「未提出」として督促されません。
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={mark}
        disabled={isPending || hasAnyRequest}
        className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-[color:var(--line)] bg-[color:var(--bg)] text-[12px] font-medium text-[color:var(--ink-2)] active:scale-95 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        希望休なしを登録
      </button>
      {hasAnyRequest && (
        <p className="mt-2 text-[10px] leading-relaxed text-[color:var(--ink-3)]">
          ※ 既に希望休が登録されているため使えません。先に申請を取り消してください。
        </p>
      )}
      {message && (
        <p
          className={`mt-3 rounded-xl p-2.5 text-[11px] ${
            message.type === "success"
              ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
              : "bg-red-50 text-[color:var(--danger)]"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
