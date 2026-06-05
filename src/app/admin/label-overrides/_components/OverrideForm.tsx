"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createOverride } from "../actions";

type Warehouse = { id: string; name: string };
type WeekdayLabel = {
  id: string;
  warehouse_id: string;
  weekday: number;
  label: string;
  color: string | null;
};

const COLORS = [
  "#9a3e3a",
  "#8a5aa8",
  "#5a7d9a",
  "#2d5545",
  "#a67234",
  "#c98579",
];

export function OverrideForm({
  warehouses,
  weekdayLabels,
}: {
  warehouses: Warehouse[];
  weekdayLabels: WeekdayLabel[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [action, setAction] = useState<"skip" | "add">("skip");
  const [color, setColor] = useState(COLORS[0]);

  const existingLabels = useMemo(
    () => Array.from(new Set(
      weekdayLabels
        .filter((l) => l.warehouse_id === warehouseId)
        .map((l) => l.label)
    )),
    [weekdayLabels, warehouseId],
  );

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("color", color);
    formData.set("action", action);
    startTransition(async () => {
      const r = await createOverride(formData);
      if (r.ok) {
        router.refresh();
        const form = document.getElementById(
          "override-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } else {
        setError(r.message ?? "エラーが発生しました");
      }
    });
  }

  return (
    <form id="override-form" action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          拠点
        </label>
        <select
          name="warehouse_id"
          required
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        >
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            対象日
          </label>
          <input
            name="override_date"
            type="date"
            required
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            ラベル
          </label>
          <input
            name="label"
            required
            list="label-list"
            placeholder="例：フェミ"
            maxLength={8}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
          <datalist id="label-list">
            {existingLabels.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          動作
        </label>
        <div className="flex gap-1 rounded-full bg-[color:var(--bg)] p-1">
          <button
            type="button"
            onClick={() => setAction("skip")}
            className={`flex-1 rounded-full py-2.5 text-[13px] font-medium transition-colors ${
              action === "skip"
                ? "bg-[color:var(--danger)] text-white"
                : "text-[color:var(--ink-3)]"
            }`}
          >
            その日はスキップ
          </button>
          <button
            type="button"
            onClick={() => setAction("add")}
            className={`flex-1 rounded-full py-2.5 text-[13px] font-medium transition-colors ${
              action === "add"
                ? "bg-[color:var(--accent)] text-white"
                : "text-[color:var(--ink-3)]"
            }`}
          >
            臨時で追加
          </button>
        </div>
      </div>

      {action === "add" && (
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            色（追加時のみ）
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full transition-transform ${
                  color === c
                    ? "scale-110 ring-2 ring-offset-2 ring-[color:var(--ink)]"
                    : ""
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          メモ（任意）
        </label>
        <input
          name="note"
          placeholder="理由など"
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-[12px] text-[color:var(--danger)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" strokeWidth={2} />
        )}
        追加する
      </button>
    </form>
  );
}
