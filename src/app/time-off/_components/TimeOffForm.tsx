"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTimeOffRequests } from "../actions";
import { Loader2, Send, Plus, X } from "lucide-react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatJp(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const date = new Date(iso + "T00:00:00");
  const wd = WEEKDAYS[date.getDay()];
  return `${m}/${d}(${wd})`;
}

type Props = {
  cycleStart: string; // YYYY-MM-DD
  cycleEnd: string;
};

export function TimeOffForm({ cycleStart, cycleEnd }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 申請可能な範囲：明日以降 かつ サイクル終了日まで
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  // 明日 と サイクル開始日 の遅い方を min にする
  const minDate = cycleStart > tomorrowStr ? cycleStart : tomorrowStr;
  const maxDate = cycleEnd;

  // 複数日付を保持
  const [dates, setDates] = useState<string[]>([]);
  const [draft, setDraft] = useState<string>("");

  function addDate() {
    if (!draft) return;
    if (draft < minDate) {
      setMessage({ type: "error", text: "申請対象期間内の日付を選んでください" });
      return;
    }
    if (draft > maxDate) {
      setMessage({
        type: "error",
        text: "今回のサイクル外です。次回サイクル開始後に再度申請してください",
      });
      return;
    }
    if (dates.includes(draft)) {
      setMessage({ type: "error", text: "同じ日付は既に追加されています" });
      setDraft("");
      return;
    }
    const next = [...dates, draft].sort();
    setDates(next);
    setDraft("");
    setMessage(null);
  }

  function removeDate(d: string) {
    setDates(dates.filter((x) => x !== d));
  }

  async function handleSubmit() {
    setMessage(null);
    if (dates.length === 0) {
      setMessage({ type: "error", text: "日付を1つ以上選択してください" });
      return;
    }
    startTransition(async () => {
      const result = await createTimeOffRequests(dates);
      if (result.ok) {
        const created = result.created ?? dates.length;
        const skipped = result.skipped ?? 0;
        setMessage({
          type: "success",
          text:
            skipped > 0
              ? `${created}件申請しました（${skipped}件は重複のためスキップ）`
              : `${created}件申請しました`,
        });
        setDates([]);
        router.refresh();
      } else {
        setMessage({
          type: "error",
          text: result.message || "エラーが発生しました",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="request_date"
          className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]"
        >
          休みたい日（複数選択可）
          <span className="ml-1 text-[10px] font-normal text-[color:var(--ink-3)]">
            {formatJp(cycleStart)} 〜 {formatJp(cycleEnd)}
          </span>
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="request_date"
            type="date"
            min={minDate}
            max={maxDate}
            disabled={isPending}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-12 flex-1 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
          <button
            type="button"
            onClick={addDate}
            disabled={isPending || !draft}
            aria-label="日付を追加"
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[color:var(--ink)] text-white shadow-[var(--shadow-sm)] transition-transform active:scale-95 disabled:bg-[color:var(--ink-4)]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[color:var(--ink-3)]">
          日付を選んで「＋」で追加。必要な分だけ繰り返してください。
        </p>
      </div>

      {/* 選択済み日付チップ */}
      {dates.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium text-[color:var(--ink-3)]">
            選択中: {dates.length} 日
          </p>
          <div className="flex flex-wrap gap-2">
            {dates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent-soft)] py-1.5 pl-3 pr-1.5 text-[12px] font-medium tabular-nums text-[color:var(--accent)]"
              >
                {formatJp(d)}
                <button
                  type="button"
                  onClick={() => removeDate(d)}
                  disabled={isPending}
                  aria-label={`${formatJp(d)}を削除`}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] text-white active:scale-90"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p
          className={`rounded-xl p-3 text-[12px] leading-relaxed ${
            message.type === "success"
              ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
              : "bg-red-50 text-[color:var(--danger)]"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || dates.length === 0}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Send className="h-4 w-4" strokeWidth={1.8} />
        )}
        {isPending
          ? "送信中"
          : dates.length > 0
            ? `${dates.length}件まとめて申請する`
            : "申請する"}
      </button>
    </div>
  );
}
