"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Warehouse = { id: string; name: string };

type StaffFormValues = {
  display_name: string;
  warehouse_id: string;
  role: "staff" | "admin";
  employment_type: "full" | "part" | "contract" | "short";
  weekly_hour_limit: number | null;
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  shift_style: "pattern" | "free" | "both";
  is_active: boolean;
};

type Props = {
  mode: "create" | "edit";
  warehouses: Warehouse[];
  initial?: Partial<StaffFormValues>;
  action: (
    formData: FormData,
  ) => Promise<{ ok: boolean; message?: string; id?: string }>;
  redirectTo?: string;
};

export function StaffForm({
  mode,
  warehouses,
  initial,
  action,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setMessage({ type: "success", text: "保存しました" });
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } else {
        setMessage({
          type: "error",
          text: result.message || "エラーが発生しました",
        });
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">

      <Field label="表示名">
        <input
          name="display_name"
          type="text"
          required
          defaultValue={initial?.display_name ?? ""}
          placeholder="例：田中 太郎"
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </Field>

      <Field label="拠点">
        <select
          name="warehouse_id"
          required
          defaultValue={initial?.warehouse_id ?? warehouses[0]?.id}
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        >
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="権限">
          <select
            name="role"
            defaultValue={initial?.role ?? "staff"}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          >
            <option value="staff">スタッフ</option>
            <option value="admin">管理者</option>
          </select>
        </Field>

        <Field label="雇用形態">
          <select
            name="employment_type"
            defaultValue={initial?.employment_type ?? "part"}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          >
            <option value="full">正社員</option>
            <option value="short">短時間社員</option>
            <option value="part">パート</option>
            <option value="contract">契約</option>
          </select>
        </Field>
      </div>

      <Field label="週の上限時間（任意）" hint="20時間制限などがある場合に入力">
        <div className="flex items-center gap-2">
          <input
            name="weekly_hour_limit"
            type="number"
            min={1}
            max={60}
            defaultValue={initial?.weekly_hour_limit ?? ""}
            placeholder="未設定"
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
          <span className="text-[13px] text-[color:var(--ink-3)]">時間</span>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="希望開始時刻">
          <input
            name="preferred_start_time"
            type="time"
            defaultValue={initial?.preferred_start_time ?? ""}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>

        <Field label="希望終了時刻">
          <input
            name="preferred_end_time"
            type="time"
            defaultValue={initial?.preferred_end_time ?? ""}
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </Field>
      </div>

      <Field label="シフト入力方式">
        <select
          name="shift_style"
          defaultValue={initial?.shift_style ?? "pattern"}
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        >
          <option value="pattern">パターン制（早番／遅番など）</option>
          <option value="free">自由入力（開始・終了時刻）</option>
          <option value="both">両方</option>
        </select>
      </Field>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[color:var(--bg)] p-3.5">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={initial?.is_active ?? true}
          className="h-5 w-5 accent-[color:var(--accent)]"
        />
        <div>
          <p className="text-[13px] font-medium text-[color:var(--ink)]">
            在籍中
          </p>
          <p className="text-[11px] text-[color:var(--ink-3)]">
            チェックを外すと一覧で非表示になります
          </p>
        </div>
      </label>

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
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "create" ? "登録する" : "保存する"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--ink-3)]">
          {hint}
        </p>
      )}
    </div>
  );
}
