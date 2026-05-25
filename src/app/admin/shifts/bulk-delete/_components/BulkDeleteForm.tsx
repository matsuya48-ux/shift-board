"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { bulkDeleteShifts } from "../actions";

type Warehouse = { id: string; name: string };

type CountPayload = {
  byWarehouse: { warehouseId: string; count: number }[];
  total: number;
};

export function BulkDeleteForm({
  warehouses,
  defaultMonth,
}: {
  warehouses: Warehouse[];
  defaultMonth: string; // YYYY-MM
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [month, setMonth] = useState(defaultMonth);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [count, setCount] = useState<CountPayload | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const expectedConfirm = `削除 ${month}`;

  // 月や倉庫が変わったら件数を取得
  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    setCount(null);
    fetch(
      `/admin/shifts/bulk-delete/api?month=${month}${
        warehouseId ? `&warehouse=${warehouseId}` : ""
      }`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data: CountPayload) => {
        if (!cancelled) {
          setCount(data);
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, warehouseId]);

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const r = await bulkDeleteShifts({
        month,
        warehouseId: warehouseId || null,
        confirmText,
      });
      if (r.ok) {
        setMessage({
          type: "success",
          text: `${r.deleted ?? 0}件のシフトを削除しました`,
        });
        setConfirmText("");
        setCount(null);
        router.refresh();
      } else {
        setMessage({
          type: "error",
          text: r.message ?? "削除に失敗しました",
        });
      }
    });
  }

  const targetCount = count?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* 警告 */}
      <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-[color:var(--danger)]"
          strokeWidth={2}
        />
        <div className="text-[12px] leading-relaxed text-[color:var(--ink-2)]">
          <p className="font-semibold text-[color:var(--danger)]">
            この操作は元に戻せません
          </p>
          <p className="mt-1">
            指定月の全シフトデータ（公開・下書き含む・予備△含む）が削除されます。
            実働記録もシフトと一緒に消えます。希望休（time_off）は残ります。
          </p>
        </div>
      </div>

      {/* 月 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          削除対象の月
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      {/* 倉庫 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          対象倉庫
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setWarehouseId("")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
              !warehouseId
                ? "bg-[color:var(--accent)] text-white"
                : "bg-[color:var(--surface)] text-[color:var(--ink-3)] shadow-[var(--shadow-sm)]"
            }`}
          >
            すべての倉庫
          </button>
          {warehouses.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWarehouseId(w.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                warehouseId === w.id
                  ? "bg-[color:var(--accent)] text-white"
                  : "bg-[color:var(--surface)] text-[color:var(--ink-3)] shadow-[var(--shadow-sm)]"
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* 件数プレビュー */}
      <div className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
        <p className="text-[11px] font-medium text-[color:var(--ink-3)]">
          削除される件数
        </p>
        <p className="mt-1 flex items-baseline gap-1 tabular-nums">
          <span className="text-[28px] font-semibold leading-none text-[color:var(--ink)]">
            {isFetching ? "—" : targetCount}
          </span>
          <span className="text-[12px] text-[color:var(--ink-3)]">件</span>
        </p>
        {count && count.byWarehouse.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-[color:var(--ink-3)] tabular-nums">
            {count.byWarehouse.map((b) => {
              const wh = warehouses.find((w) => w.id === b.warehouseId);
              return (
                <li key={b.warehouseId}>
                  {wh?.name ?? "(不明)"}: {b.count}件
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 確認テキスト */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          確認のため「<span className="font-mono">{expectedConfirm}</span>」と入力
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={expectedConfirm}
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] text-[color:var(--ink)] focus:border-[color:var(--danger)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-red-100"
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
        onClick={submit}
        disabled={
          isPending ||
          targetCount === 0 ||
          confirmText.trim() !== expectedConfirm
        }
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--danger)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(194,74,74,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        )}
        {isPending
          ? "削除中…"
          : targetCount > 0
            ? `${targetCount}件 削除する`
            : "削除対象なし"}
      </button>
    </div>
  );
}
