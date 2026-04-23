"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { createAnnouncement } from "../actions";

type Warehouse = { id: string; name: string };

export function AnnouncementForm({
  warehouses,
}: {
  warehouses: Warehouse[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await createAnnouncement(formData);
      if (r.ok) {
        router.refresh();
        const form = document.getElementById(
          "announce-form",
        ) as HTMLFormElement | null;
        form?.reset();
      } else {
        setError(r.message ?? "エラーが発生しました");
      }
    });
  }

  return (
    <form id="announce-form" action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          タイトル
        </label>
        <input
          name="title"
          required
          placeholder="例：5月シフトは4/25までに公開します"
          className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
          本文（任意）
        </label>
        <textarea
          name="body"
          rows={3}
          placeholder="詳細を入力してください"
          className="w-full resize-none rounded-xl border border-[color:var(--line)] bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            対象拠点
          </label>
          <select
            name="warehouse_id"
            defaultValue=""
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[13px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          >
            <option value="">全拠点</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-medium text-[color:var(--ink-2)]">
            公開期限（任意）
          </label>
          <input
            name="expires_at"
            type="date"
            className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3.5 text-[13px] tabular-nums text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[color:var(--bg)] p-3.5">
        <input
          name="is_pinned"
          type="checkbox"
          className="h-5 w-5 accent-[color:var(--accent)]"
        />
        <div>
          <p className="text-[13px] font-medium text-[color:var(--ink)]">
            ピン留め
          </p>
          <p className="text-[11px] text-[color:var(--ink-3)]">
            一覧の最上部に固定表示されます
          </p>
        </div>
      </label>

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
          <Send className="h-4 w-4" strokeWidth={1.8} />
        )}
        公開する
      </button>
    </form>
  );
}
