"use client";

/**
 * 出荷／事業部ラベルのポップオーバー
 *
 * 表示:
 * - 各日の有効ラベル（曜日ベース＋臨時追加）をカード行に並べて表示
 * - スタッフは閲覧のみ。管理者は以下が可能:
 *    1) 「毎週適用中」のラベルを今日だけスキップ
 *    2) 「今日だけ追加」した臨時ラベルを削除
 *    3) スキップ中のラベルを「戻す」
 *    4) 今日だけのラベルを新規追加
 *
 * サーバーアクションは既存の createOverride / deleteOverride を再利用する。
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, RotateCcw, Check, Loader2 } from "lucide-react";
import {
  createOverride,
  deleteOverride,
} from "@/app/admin/label-overrides/actions";
import type { WeekdayLabel, DateLabelOverride } from "@/lib/labels";

const COLORS = [
  "#9a3e3a",
  "#8a5aa8",
  "#5a7d9a",
  "#2d5545",
  "#a67234",
  "#c98579",
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  date: string; // YYYY-MM-DD
  warehouseId: string;
  warehouseName?: string;
  /** この日の曜日に対応する基本ラベル（warehouseId でフィルタ済み） */
  baseLabels: WeekdayLabel[];
  /** この日 × warehouse の override 一覧 */
  overrides: DateLabelOverride[];
  isAdmin?: boolean;
};

export function LabelPopover({
  date,
  warehouseId,
  warehouseName,
  baseLabels,
  overrides,
  isAdmin = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(COLORS[3]);

  const [y, m, d] = date.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const wd = WEEKDAYS[dateObj.getDay()];

  const skipped = new Set(
    overrides.filter((o) => o.action === "skip").map((o) => o.label),
  );
  const addedOverrides = overrides.filter((o) => o.action === "add");
  const activeBaseLabels = baseLabels.filter((l) => !skipped.has(l.label));
  const skippedBaseLabels = baseLabels.filter((l) => skipped.has(l.label));

  // セルに見せる現在の有効ラベル（base 適用中 + added）
  const allEffective = [
    ...activeBaseLabels.map((l) => ({
      label: l.label,
      color: l.color ?? "#5a7d9a",
      source: "base" as const,
    })),
    ...addedOverrides.map((o) => ({
      label: o.label,
      color: o.color ?? "#5a7d9a",
      source: "added" as const,
    })),
  ];

  function skipBase(label: WeekdayLabel) {
    if (!confirm(`「${label.label}」を今日だけ除外しますか？`)) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("warehouse_id", warehouseId);
      fd.set("override_date", date);
      fd.set("label", label.label);
      fd.set("action", "skip");
      fd.set("color", label.color ?? "#5a7d9a");
      const r = await createOverride(fd);
      if (r.ok) router.refresh();
      else setError(r.message ?? "失敗しました");
    });
  }

  function deleteOver(id: string) {
    if (!confirm("この例外を削除しますか？")) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteOverride(id);
      if (r.ok) router.refresh();
      else setError(r.message ?? "失敗しました");
    });
  }

  function addOverride() {
    setError(null);
    if (!newLabel.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("warehouse_id", warehouseId);
      fd.set("override_date", date);
      fd.set("label", newLabel.trim());
      fd.set("action", "add");
      fd.set("color", newColor);
      const r = await createOverride(fd);
      if (r.ok) {
        setNewLabel("");
        setAdding(false);
        router.refresh();
      } else {
        setError(r.message ?? "失敗しました");
      }
    });
  }

  // ラベル0件 & 非管理者なら何も描画しない（クリック領域をなくす）
  if (allEffective.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-center transition-opacity active:opacity-60"
      >
        {allEffective.length === 0 ? (
          <span className="text-[8px] text-[color:var(--ink-4)]">＋</span>
        ) : (
          allEffective.map((l, i) => (
            <div
              key={i}
              className="mx-auto truncate rounded px-0.5 text-[8px] font-semibold leading-tight text-white"
              style={{ background: l.color }}
              title={l.source === "added" ? `${l.label}（臨時）` : l.label}
            >
              {l.source === "added" ? `+${l.label}` : l.label}
            </div>
          ))
        )}
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
                  Shipping schedule
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

            {/* 適用中（base） */}
            {activeBaseLabels.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                  毎週適用中
                </p>
                <div className="space-y-2">
                  {activeBaseLabels.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[var(--shadow-sm)]"
                    >
                      <div
                        className="flex-shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white"
                        style={{ background: l.color ?? "#5a7d9a" }}
                      >
                        {l.label}
                      </div>
                      <p className="flex-1 text-[11px] text-[color:var(--ink-3)]">
                        毎週{WEEKDAYS[l.weekday]}曜
                      </p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => skipBase(l)}
                          disabled={isPending}
                          className="flex h-8 items-center gap-1 rounded-full bg-[color:var(--bg)] px-3 text-[11px] font-medium text-[color:var(--ink-3)] active:scale-95"
                        >
                          今日だけ除外
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 臨時追加（added） */}
            {addedOverrides.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                  今日だけ追加
                </p>
                <div className="space-y-2">
                  {addedOverrides.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[var(--shadow-sm)]"
                    >
                      <div
                        className="flex-shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white"
                        style={{ background: o.color ?? "#5a7d9a" }}
                      >
                        ＋{o.label}
                      </div>
                      <p className="flex-1 text-[11px] text-[color:var(--ink-3)]">
                        臨時追加
                      </p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteOver(o.id)}
                          disabled={isPending}
                          aria-label="削除"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bg)] text-[color:var(--danger)] active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 除外中（skipped） */}
            {skippedBaseLabels.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--ink-3)]">
                  今日のみ除外中
                </p>
                <div className="space-y-2">
                  {skippedBaseLabels.map((l) => {
                    const skipOverride = overrides.find(
                      (o) => o.action === "skip" && o.label === l.label,
                    );
                    return (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[var(--shadow-sm)]"
                      >
                        <div
                          className="flex-shrink-0 rounded-full bg-[color:var(--bg)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--ink-3)] line-through"
                        >
                          {l.label}
                        </div>
                        <p className="flex-1 text-[11px] text-[color:var(--ink-3)]">
                          除外中
                        </p>
                        {isAdmin && skipOverride && (
                          <button
                            type="button"
                            onClick={() => deleteOver(skipOverride.id)}
                            disabled={isPending}
                            className="flex h-8 items-center gap-1 rounded-full bg-[color:var(--bg)] px-3 text-[11px] font-medium text-[color:var(--ink-3)] active:scale-95"
                          >
                            <RotateCcw className="h-3 w-3" strokeWidth={2} />
                            戻す
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 追加（管理者のみ） */}
            {isAdmin && (
              <div className="mt-5">
                {adding ? (
                  <div className="space-y-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium text-[color:var(--ink-2)]">
                        ラベル名
                      </label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="例：CL"
                        maxLength={6}
                        className="h-10 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
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
                            onClick={() => setNewColor(c)}
                            className={`h-7 w-7 rounded-full transition-transform ${
                              newColor === c
                                ? "scale-110 ring-2 ring-offset-2 ring-[color:var(--ink)]"
                                : ""
                            }`}
                            style={{ background: c }}
                            aria-label={c}
                          />
                        ))}
                      </div>
                    </div>
                    {error && (
                      <p className="rounded-xl bg-red-50 p-2.5 text-[11px] text-[color:var(--danger)]">
                        {error}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addOverride}
                        disabled={isPending || !newLabel.trim()}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[12px] font-medium text-white active:scale-95 disabled:bg-[color:var(--ink-4)]"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        )}
                        追加
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false);
                          setNewLabel("");
                          setError(null);
                        }}
                        disabled={isPending}
                        className="h-10 rounded-full bg-[color:var(--bg)] px-4 text-[12px] font-medium text-[color:var(--ink-3)] active:scale-95"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[color:var(--surface)] text-[12px] font-medium text-[color:var(--accent)] shadow-[var(--shadow-sm)] active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    今日だけ追加
                  </button>
                )}
              </div>
            )}

            {!isAdmin && allEffective.length === 0 && (
              <p className="text-center text-[12px] text-[color:var(--ink-3)]">
                出荷予定はありません
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
