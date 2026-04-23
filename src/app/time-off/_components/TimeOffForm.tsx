"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTimeOffRequest } from "../actions";
import { Loader2, Send } from "lucide-react";

export function TimeOffForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await createTimeOffRequest(formData);
      if (result.ok) {
        setMessage({ type: "success", text: "申請しました" });
        router.refresh();
        const form = document.getElementById(
          "time-off-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } else {
        setMessage({
          type: "error",
          text: result.message || "エラーが発生しました",
        });
      }
    });
  }

  return (
    <form id="time-off-form" action={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="request_date"
          className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]"
        >
          休みたい日
        </label>
        <input
          id="request_date"
          name="request_date"
          type="date"
          required
          min={minDate}
          disabled={isPending}
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[15px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
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
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Send className="h-4 w-4" strokeWidth={1.8} />
        )}
        {isPending ? "送信中" : "申請する"}
      </button>
    </form>
  );
}
