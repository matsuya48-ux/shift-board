"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { verifyAdminPin, setupAdminPin } from "../actions";

export function PinForm({ mode }: { mode: "verify" | "setup" }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "setup"
          ? await setupAdminPin(formData)
          : await verifyAdminPin(formData);
      if (result && !result.ok) {
        setError(result.message ?? "エラーが発生しました");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          PIN
        </label>
        <input
          name="pin"
          type="password"
          required
          autoFocus
          inputMode="numeric"
          pattern="[0-9A-Za-z]*"
          placeholder="••••"
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-center text-[20px] tracking-[0.3em] text-[color:var(--ink)] placeholder:text-[color:var(--ink-4)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      {mode === "setup" && (
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            PIN（確認）
          </label>
          <input
            name="confirm"
            type="password"
            required
            inputMode="numeric"
            pattern="[0-9A-Za-z]*"
            placeholder="••••"
            className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-center text-[20px] tracking-[0.3em] text-[color:var(--ink)] placeholder:text-[color:var(--ink-4)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-center text-[12px] text-[color:var(--danger)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "setup" ? "PINを設定してログイン" : "ログイン"}
      </button>
    </form>
  );
}
