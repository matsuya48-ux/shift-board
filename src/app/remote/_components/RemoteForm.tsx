"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Check } from "lucide-react";
import {
  createRemoteReport,
  updateRemoteReport,
} from "../actions";
import {
  workHours,
  itemsPerHour,
  fmtHours1,
  fmtPerHour,
} from "@/lib/remote";

type Props = {
  /** 編集モード時、対象report */
  initial?: {
    id: string;
    work_date: string;
    task_name: string;
    start_time: string;
    end_time: string;
    item_count: number;
    note: string | null;
  };
  onDone?: () => void;
  taskSuggestions?: string[];
};

export function RemoteForm({ initial, onDone, taskSuggestions = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [workDate, setWorkDate] = useState(initial?.work_date ?? today);
  const [taskName, setTaskName] = useState(initial?.task_name ?? "");
  const [startTime, setStartTime] = useState(
    initial?.start_time?.slice(0, 5) ?? "09:00",
  );
  const [endTime, setEndTime] = useState(
    initial?.end_time?.slice(0, 5) ?? "12:00",
  );
  const [itemCount, setItemCount] = useState<number>(
    initial?.item_count ?? 0,
  );
  const [note, setNote] = useState(initial?.note ?? "");

  const hours =
    startTime && endTime ? workHours(startTime, endTime) : 0;
  const rate =
    startTime && endTime && itemCount > 0
      ? itemsPerHour(startTime, endTime, itemCount)
      : 0;

  function reset() {
    setWorkDate(today);
    setTaskName("");
    setStartTime("09:00");
    setEndTime("12:00");
    setItemCount(0);
    setNote("");
  }

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const payload = {
        work_date: workDate,
        task_name: taskName,
        start_time: startTime,
        end_time: endTime,
        item_count: itemCount,
        note,
      };
      const result = initial
        ? await updateRemoteReport(initial.id, payload)
        : await createRemoteReport(payload);

      if (result.ok) {
        setMessage({
          type: "success",
          text: initial ? "更新しました" : "登録しました",
        });
        if (!initial) reset();
        router.refresh();
        onDone?.();
      } else {
        setMessage({
          type: "error",
          text: result.message ?? "エラーが発生しました",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 日付 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          日付
        </label>
        <input
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      {/* 業務内容 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          業務内容
        </label>
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          list="remote-task-suggestions"
          placeholder="例：商品登録／メール対応／検品入力"
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
        {taskSuggestions.length > 0 && (
          <datalist id="remote-task-suggestions">
            {taskSuggestions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        )}
      </div>

      {/* 開始・終了 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
            開始
          </label>
          <input
            type="time"
            step={60}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
            終了
          </label>
          <input
            type="time"
            step={60}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
      </div>

      {/* 件数 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          作業件数
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            value={itemCount}
            onChange={(e) => setItemCount(Number(e.target.value) || 0)}
            className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[16px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
          <span className="text-[13px] text-[color:var(--ink-3)]">件</span>
        </div>
      </div>

      {/* リアルタイム計算結果 */}
      <div className="flex items-stretch gap-2 rounded-2xl bg-[color:var(--accent-soft)] p-4">
        <div className="flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--accent)]">
            作業時間
          </p>
          <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[color:var(--ink)]">
            {fmtHours1(hours)}
            <span className="ml-0.5 text-[11px] font-normal text-[color:var(--ink-3)]">
              h
            </span>
          </p>
        </div>
        <div className="w-px bg-[color:var(--accent)]/20" />
        <div className="flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--accent)]">
            1時間あたり
          </p>
          <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[color:var(--ink)]">
            {fmtPerHour(rate)}
            <span className="ml-0.5 text-[11px] font-normal text-[color:var(--ink-3)]">
              件/h
            </span>
          </p>
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          メモ（任意）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="補足事項があれば"
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-3 text-[14px] leading-relaxed text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

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
        disabled={isPending || !taskName.trim() || itemCount < 0}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : initial ? (
          <Check className="h-4 w-4" strokeWidth={2} />
        ) : (
          <Send className="h-4 w-4" strokeWidth={1.8} />
        )}
        {isPending ? "送信中" : initial ? "更新する" : "報告する"}
      </button>
    </div>
  );
}
