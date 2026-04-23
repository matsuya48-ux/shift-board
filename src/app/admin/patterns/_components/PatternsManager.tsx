"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Check, X } from "lucide-react";
import { createPattern, updatePattern, deletePattern } from "../actions";

type Warehouse = { id: string; name: string };
type Pattern = {
  id: string;
  warehouse_id: string;
  code: string;
  label: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  color: string | null;
};

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#2d5545", // forest
  "#a67234", // amber
  "#9a3e3a", // red
  "#5a7d9a", // blue-gray
  "#8a5aa8", // purple
];

export function PatternsManager({
  warehouses,
  patterns,
}: {
  warehouses: Warehouse[];
  patterns: Pattern[];
}) {
  const [selectedWh, setSelectedWh] = useState<string>(
    warehouses[0]?.id ?? "",
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = patterns.filter((p) => p.warehouse_id === selectedWh);

  if (warehouses.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* 拠点タブ */}
      <div className="flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
        {warehouses.map((wh) => {
          const active = selectedWh === wh.id;
          return (
            <button
              key={wh.id}
              type="button"
              onClick={() => setSelectedWh(wh.id)}
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                active
                  ? "bg-[color:var(--accent)] text-white"
                  : "text-[color:var(--ink-3)]"
              }`}
            >
              {wh.name}
            </button>
          );
        })}
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        {filtered.length === 0 && !showForm && (
          <div className="rounded-3xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[13px] text-[color:var(--ink-3)]">
              まだパターンがありません
            </p>
          </div>
        )}

        {filtered.map((p) =>
          editingId === p.id ? (
            <PatternForm
              key={p.id}
              mode="edit"
              warehouse_id={selectedWh}
              initial={p}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <PatternCard
              key={p.id}
              pattern={p}
              onEdit={() => setEditingId(p.id)}
            />
          ),
        )}

        {/* 追加フォーム or 追加ボタン */}
        {showForm ? (
          <PatternForm
            mode="create"
            warehouse_id={selectedWh}
            onCancel={() => setShowForm(false)}
            onSaved={() => setShowForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[color:var(--line)] py-4 text-[13px] font-medium text-[color:var(--ink-2)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            パターンを追加
          </button>
        )}
      </div>
    </div>
  );
}

function PatternCard({
  pattern,
  onEdit,
}: {
  pattern: Pattern;
  onEdit: () => void;
}) {
  const mins = timeToMin(pattern.end_time) - timeToMin(pattern.start_time);
  const workMins =
    (mins < 0 ? mins + 24 * 60 : mins) - pattern.break_minutes;
  const hours = (workMins / 60).toFixed(1).replace(/\.0$/, "");

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 rounded-2xl bg-[color:var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98]"
    >
      <div
        className="h-10 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: pattern.color ?? "#6366f1" }}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
          {pattern.label}
          <span className="ml-2 text-[11px] font-normal text-[color:var(--ink-3)]">
            {pattern.code}
          </span>
        </p>
        <p className="text-[11px] text-[color:var(--ink-3)] tabular-nums">
          {pattern.start_time.slice(0, 5)} – {pattern.end_time.slice(0, 5)}
          <span className="mx-1.5">／</span>
          休憩 {pattern.break_minutes} 分
          <span className="mx-1.5">／</span>
          実働 {hours}h
        </p>
      </div>
    </button>
  );
}

function PatternForm({
  mode,
  warehouse_id,
  initial,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  warehouse_id: string;
  initial?: Pattern;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("warehouse_id", warehouse_id);
    formData.set("color", color);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPattern(formData)
          : await updatePattern(initial!.id, formData);
      if (result.ok) {
        router.refresh();
        onSaved();
      } else {
        setError(result.message ?? "エラーが発生しました");
      }
    });
  }

  function handleDelete() {
    if (!initial) return;
    if (!confirm(`「${initial.label}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deletePattern(initial.id);
      if (result.ok) {
        router.refresh();
        onSaved();
      } else {
        setError(result.message ?? "削除に失敗しました");
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-2xl bg-[color:var(--surface)] p-5 shadow-[var(--shadow-sm)]"
    >
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Field label="コード">
          <input
            name="code"
            required
            defaultValue={initial?.code ?? ""}
            placeholder="early"
            maxLength={16}
            className="h-11 w-24 rounded-xl border border-[color:var(--line)] bg-white px-3 font-mono text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>
        <Field label="表示名">
          <input
            name="label"
            required
            defaultValue={initial?.label ?? ""}
            placeholder="早番"
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="開始">
          <input
            name="start_time"
            type="time"
            required
            defaultValue={initial?.start_time?.slice(0, 5) ?? "09:00"}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>
        <Field label="終了">
          <input
            name="end_time"
            type="time"
            required
            defaultValue={initial?.end_time?.slice(0, 5) ?? "18:00"}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>
        <Field label="休憩(分)">
          <input
            name="break_minutes"
            type="number"
            min={0}
            max={300}
            defaultValue={initial?.break_minutes ?? 60}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          色
        </label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full transition-transform ${
                color === c ? "scale-110 ring-2 ring-offset-2 ring-[color:var(--ink)]" : ""
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

      <div className="flex gap-2">
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex h-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-4 text-[12px] font-medium text-[color:var(--danger)] transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white text-[12px] font-medium text-[color:var(--ink-2)] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] text-[12px] font-medium text-white shadow-[0_4px_14px_-4px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
          保存
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
