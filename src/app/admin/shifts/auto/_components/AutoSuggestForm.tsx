"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Check } from "lucide-react";
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
  } | null>(null);

  async function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await autoSuggest(formData);
      setResult(r);
      if (r.ok) {
        router.refresh();
      }
    });
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
            拠点
          </label>
          <select
            name="warehouse_id"
            required
            defaultValue={warehouses[0]?.id}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
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
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          )}
          {isPending ? "作成中…" : "シフトを自動提案する"}
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
            ※ 作成したシフトは下書きです。内容を確認後、スタッフ別の画面から公開してください
          </p>
        </div>
      )}
    </>
  );
}
