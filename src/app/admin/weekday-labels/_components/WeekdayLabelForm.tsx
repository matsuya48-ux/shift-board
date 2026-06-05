"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createWeekdayLabel } from "../actions";

type Warehouse = { id: string; name: string };

const WEEKDAYS = [
  { value: 0, label: "日曜" },
  { value: 1, label: "月曜" },
  { value: 2, label: "火曜" },
  { value: 3, label: "水曜" },
  { value: 4, label: "木曜" },
  { value: 5, label: "金曜" },
  { value: 6, label: "土曜" },
];

const COLORS = [
  "#9a3e3a",
  "#8a5aa8",
  "#5a7d9a",
  "#2d5545",
  "#a67234",
  "#c98579",
];

export function WeekdayLabelForm({
  warehouses,
}: {
  warehouses: Warehouse[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("color", color);
    startTransition(async () => {
      const r = await createWeekdayLabel(formData);
      if (r.ok) {
        router.refresh();
        const form = document.getElementById(
          "weekday-label-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } else {
        setError(r.message ?? "エラーが発生しました");
      }
    });
  }

  return (
    <form
      id="weekday-label-form"
      action={handleSubmit}
      className="space-y-4"
    >
      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            曜日
          </label>
          <select
            name="weekday"
            required
            defaultValue={1}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          >
            {WEEKDAYS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            ラベル（短く）
          </label>
          <input
            name="label"
            required
            maxLength={8}
            placeholder="例：CL"
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          色
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
