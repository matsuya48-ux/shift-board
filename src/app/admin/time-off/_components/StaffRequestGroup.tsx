"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RotateCcw, Loader2, ChevronDown } from "lucide-react";
import {
  approveTimeOff,
  rejectTimeOff,
  revertTimeOff,
} from "../actions";

type Req = {
  id: string;
  request_date: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
  decider_name?: string | null;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function fmt(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
    wd: WEEKDAYS[d.getDay()],
    isSun: d.getDay() === 0,
    isSat: d.getDay() === 6,
  };
}

function fmtDecided(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

export function StaffRequestGroup({
  staffName,
  warehouseName,
  requests,
}: {
  staffName: string;
  warehouseName: string | null;
  requests: Req[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  // ステータス別カウント
  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const sorted = [...requests].sort((a, b) =>
    a.request_date.localeCompare(b.request_date),
  );

  function run(
    id: string,
    action: (f: FormData) => Promise<{ ok: boolean; message?: string }>,
  ) {
    const form = new FormData();
    form.set("id", id);
    form.set("note", note);
    startTransition(async () => {
      const result = await action(form);
      if (result.ok) {
        router.refresh();
        setExpandedId(null);
        setNote("");
      } else if (result.message) {
        alert(result.message);
      }
    });
  }

  function openItem(req: Req) {
    if (expandedId === req.id) {
      setExpandedId(null);
    } else {
      setExpandedId(req.id);
      setNote(req.admin_note ?? "");
    }
  }

  return (
    <div className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      {/* ヘッダー：スタッフ名 + サマリー */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[color:var(--ink)]">
            {staffName}
          </p>
          <p className="truncate text-[11px] text-[color:var(--ink-3)]">
            {warehouseName ?? "拠点不明"} ／ 合計 {requests.length} 日
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          {counts.pending > 0 && (
            <span className="rounded-full bg-[#fdf5e6] px-2 py-0.5 text-[10px] font-medium text-[color:var(--warning)]">
              申請中 {counts.pending}
            </span>
          )}
          {counts.approved > 0 && (
            <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--accent)]">
              承認 {counts.approved}
            </span>
          )}
          {counts.rejected > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-[color:var(--danger)]">
              却下 {counts.rejected}
            </span>
          )}
        </div>
      </div>

      {/* 日付チップ一覧 */}
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((r) => {
          const { month, day, wd, isSun, isSat } = fmt(r.request_date);
          const active = expandedId === r.id;
          const dateColor = isSun
            ? "text-[color:var(--danger)]"
            : isSat
              ? "text-[#3a5a7a]"
              : "text-[color:var(--ink-2)]";
          const bgByStatus =
            r.status === "approved"
              ? "bg-[color:var(--accent-soft)] border-[color:var(--accent)]/30"
              : r.status === "rejected"
                ? "bg-red-50 border-red-200"
                : "bg-[#fdf5e6] border-[#f0d97a]";
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => openItem(r)}
              className={`flex items-baseline gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium tabular-nums transition-transform active:scale-95 ${bgByStatus} ${
                active ? "ring-2 ring-[color:var(--accent)]" : ""
              }`}
            >
              <span className={dateColor}>
                {month}/{day}
              </span>
              <span className={`text-[10px] ${dateColor}`}>({wd})</span>
            </button>
          );
        })}
      </div>

      {/* 選択中の日付の操作パネル */}
      {expandedId &&
        (() => {
          const r = sorted.find((x) => x.id === expandedId);
          if (!r) return null;
          const { month, day, wd } = fmt(r.request_date);
          return (
            <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] p-3">
              <p className="mb-2 text-[12px] font-semibold text-[color:var(--ink-2)]">
                {month}月{day}日({wd})の操作
              </p>

              {/* 承認・却下情報 */}
              {r.status !== "pending" && r.decided_at && (
                <p className="mb-2 text-[10px] tabular-nums text-[color:var(--ink-3)]">
                  {r.status === "approved" ? "承認" : "却下"}：
                  {r.decider_name ?? "（不明）"}
                  <span className="ml-1.5 text-[color:var(--ink-4)]">
                    {fmtDecided(r.decided_at)}
                  </span>
                </p>
              )}

              {r.admin_note && r.status !== "pending" && (
                <p className="mb-2 rounded-lg bg-white p-2 text-[11px] text-[color:var(--ink-2)]">
                  管理者メモ：{r.admin_note}
                </p>
              )}

              {r.status === "pending" ? (
                <>
                  <label className="mb-1 block text-[10px] font-medium text-[color:var(--ink-2)]">
                    メモ（任意・スタッフに表示されます）
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="例：ありがとうございます"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5 text-[12px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => run(r.id, rejectTimeOff)}
                      disabled={isPending}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white text-[12px] font-medium text-[color:var(--danger)] active:scale-95 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" strokeWidth={2.2} />
                      )}
                      却下
                    </button>
                    <button
                      type="button"
                      onClick={() => run(r.id, approveTimeOff)}
                      disabled={isPending}
                      className="flex h-9 flex-[2] items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[12px] font-medium text-white active:scale-95 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      )}
                      承認
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => run(r.id, revertTimeOff)}
                  disabled={isPending}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white text-[11px] font-medium text-[color:var(--ink-2)] active:scale-95 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" strokeWidth={2} />
                  )}
                  申請中に戻す
                </button>
              )}
            </div>
          );
        })()}
    </div>
  );
}
