"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createEvent } from "../actions";

type Warehouse = { id: string; name: string };

const COLORS = [
  "#c98579", // sale
  "#5a7d9a", // 荷物
  "#8a5aa8", // AW
  "#a67234", // 商品部
  "#2d5545", // general
  "#9a3e3a", // urgent
];

export function EventForm({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("color", color);
    startTransition(async () => {
      const r = await createEvent(formData);
      if (r.ok) {
        router.refresh();
        const form = document.getElementById("event-form") as HTMLFormElement | null;
        form?.reset();
      } else {
        setError(r.message ?? "エラーが発生しました");
      }
    });
  }

  return (
    <form id="event-form" action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            拠点
          </label>
          <select
            name="warehouse_id"
            required
            defaultValue={warehouses[0]?.id}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            日付
          </label>
          <input
            name="event_date"
            type="date"
            required
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          タイトル（短く）
        </label>
        <input
          name="title"
          required
          placeholder="例：AW荷物"
          maxLength={12}
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          詳細（任意）
        </label>
        <input
          name="description"
          placeholder="補足メモ"
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
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
