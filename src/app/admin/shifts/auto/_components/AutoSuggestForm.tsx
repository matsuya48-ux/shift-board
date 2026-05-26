"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Check, ArrowRight } from "lucide-react";
import { autoSuggest } from "../actions";

type Warehouse = { id: string; name: string };

export function AutoSuggestForm({
  warehouses,
  defaultMonth,
  nextMonthStr,
}: {
  warehouses: Warehouse[];
  defaultMonth: string;
  nextMonthStr: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message?: string;
    stats?: {
      created: number;
      skipped: number;
      perStaff: {
        name: string;
        created: number;
        skipped: number;
        reason?: string;
      }[];
    };
    warehouseIds?: string[];
  } | null>(null);

  // 既定で全拠点選択
  const [selectedWarehouses, setSelectedWarehouses] = useState<Set<string>>(
    new Set(warehouses.map((w) => w.id)),
  );

  function toggleWarehouse(id: string) {
    setSelectedWarehouses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedWarehouses(new Set(warehouses.map((w) => w.id)));
  }
  function clearAll() {
    setSelectedWarehouses(new Set());
  }

  // 成功時の遷移先（単一倉庫選択時のみボードへ。複数選択時は全員のシフトへ）
  const [pendingNav, setPendingNav] = useState<{
    warehouseIds: string[];
    month: string;
  } | null>(null);

  useEffect(() => {
    if (!pendingNav) return;
    const t = setTimeout(() => {
      if (pendingNav.warehouseIds.length === 1) {
        router.push(
          `/admin/shifts/board?warehouse=${pendingNav.warehouseIds[0]}&month=${pendingNav.month}`,
        );
      } else {
        router.push(`/shifts/all?view=month&month=${pendingNav.month}`);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [pendingNav, router]);

  async function handleSubmit(formData: FormData) {
    setResult(null);
    setPendingNav(null);
    // チェックボックスから倉庫ID群を formData に詰める
    formData.delete("warehouse_id");
    for (const id of selectedWarehouses) formData.append("warehouse_id", id);
    const month = (formData.get("month") as string) ?? "";
    const whIds = [...selectedWarehouses];
    startTransition(async () => {
      const r = await autoSuggest(formData);
      setResult(r);
      if (r.ok) {
        router.refresh();
        if (whIds.length > 0 && month) {
          setPendingNav({ warehouseIds: whIds, month });
        }
      }
    });
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-medium text-[color:var(--ink-2)]">
              拠点（複数選択可）
            </label>
            <div className="flex gap-1 text-[10px]">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 font-medium text-[color:var(--ink-3)] active:scale-95"
              >
                全選択
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 font-medium text-[color:var(--ink-3)] active:scale-95"
              >
                解除
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {warehouses.map((wh) => {
              const checked = selectedWarehouses.has(wh.id);
              return (
                <label
                  key={wh.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    checked
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                      : "border-[color:var(--line)] bg-white text-[color:var(--ink-2)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWarehouse(wh.id)}
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  {wh.name}
                </label>
              );
            })}
          </div>
          {selectedWarehouses.size === 0 && (
            <p className="mt-1.5 text-[11px] text-[color:var(--danger)]">
              ※ 拠点を1つ以上選択してください
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
            対象月
          </label>
          <div className="flex gap-2">
            <input
              name="month"
              type="month"
              required
              defaultValue={nextMonthStr}
              className="h-11 flex-1 rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[color:var(--ink-3)]">
            デフォルトは翌月（{nextMonthStr}）です。{defaultMonth === nextMonthStr ? "" : `今月=${defaultMonth}`}
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || selectedWarehouses.size === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          )}
          {isPending
            ? "作成中…"
            : selectedWarehouses.size === 0
              ? "拠点を選択してください"
              : `シフトを自動提案する（${selectedWarehouses.size}拠点）`}
        </button>
      </form>

      {result && !result.ok && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-[12px] text-[color:var(--danger)]">
          {result.message}
        </p>
      )}

      {result?.ok && result.stats && (
        <div className="mt-6 animate-rise">
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[color:var(--accent-soft)] p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]">
              <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-[13px]">
              <p className="font-semibold text-[color:var(--ink)]">
                {result.stats.created} 件のシフトを下書きで作成しました
              </p>
              {result.stats.skipped > 0 && (
                <p className="text-[11px] text-[color:var(--ink-3)]">
                  既存・希望休・上限超過でスキップ: {result.stats.skipped} 件
                </p>
              )}
            </div>
          </div>

          {/* 確認画面へ移動ボタン（自動で 2 秒後にも遷移） */}
          {pendingNav && (
            <button
              type="button"
              onClick={() => {
                if (pendingNav.warehouseIds.length === 1) {
                  router.push(
                    `/admin/shifts/board?warehouse=${pendingNav.warehouseIds[0]}&month=${pendingNav.month}`,
                  );
                } else {
                  router.push(
                    `/shifts/all?view=month&month=${pendingNav.month}`,
                  );
                }
              }}
              className="mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--ink)] text-[14px] font-medium text-white shadow-[var(--shadow-md)] transition-transform active:scale-[0.98]"
            >
              {pendingNav.warehouseIds.length === 1
                ? "ボードで確認する"
                : "全員のシフトで確認する"}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          )}

          <div className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
            <table className="w-full text-left">
              <thead className="bg-[color:var(--bg)]">
                <tr>
                  <th className="px-3 py-2 text-[11px] font-semibold text-[color:var(--ink-3)]">
                    スタッフ
                  </th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold text-[color:var(--ink-3)]">
                    作成
                  </th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold text-[color:var(--ink-3)]">
                    スキップ
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.stats.perStaff.map((p, i) => (
                  <tr
                    key={i}
                    className="border-t border-[color:var(--line-soft)]"
                  >
                    <td className="px-3 py-2 text-[12px] text-[color:var(--ink)]">
                      {p.name}
                      {p.reason && (
                        <span className="ml-1 text-[10px] text-[color:var(--ink-3)]">
                          （{p.reason}）
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-[12px] tabular-nums text-[color:var(--accent)]">
                      {p.created}
                    </td>
                    <td className="px-2 py-2 text-right text-[12px] tabular-nums text-[color:var(--ink-3)]">
                      {p.skipped}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-[11px] text-[color:var(--ink-3)]">
            ※ 作成したシフトは下書きです。
            {pendingNav
              ? pendingNav.warehouseIds.length === 1
                ? "まもなくボードに移動して内容を確認します…"
                : "まもなく全員のシフトに移動します…"
              : "内容を確認後、スタッフ別の画面から公開してください"}
          </p>
        </div>
      )}
    </>
  );
}
