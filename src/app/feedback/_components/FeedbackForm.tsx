"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles, Bug, MessageCircle } from "lucide-react";
import { createFeedback, type FeedbackCategory } from "../actions";

type CategoryDef = {
  value: FeedbackCategory;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const CATEGORIES: CategoryDef[] = [
  {
    value: "feature",
    label: "機能追加",
    description: "こんな機能があったら嬉しい",
    Icon: Sparkles,
  },
  {
    value: "bug",
    label: "不具合",
    description: "うまく動かない・表示が変",
    Icon: Bug,
  },
  {
    value: "other",
    label: "その他",
    description: "質問・感想・要望など",
    Icon: MessageCircle,
  },
];

export function FeedbackForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await createFeedback(formData);
      if (result.ok) {
        setMessage({
          type: "success",
          text: "送信しました。ありがとうございます！",
        });
        setTitle("");
        setBody("");
        setCategory("feature");
        router.refresh();
      } else {
        setMessage({
          type: "error",
          text: result.message || "送信に失敗しました",
        });
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* カテゴリ選択 */}
      <div>
        <label className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]">
          カテゴリ
        </label>
        <input type="hidden" name="category" value={category} />
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(({ value, label, Icon }) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                disabled={isPending}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors ${
                  active
                    ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                    : "border-[color:var(--line)] bg-[color:var(--surface)]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--ink-3)]"
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className={`text-[12px] font-medium ${
                    active
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--ink-2)]"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-[color:var(--ink-3)]">
          {CATEGORIES.find((c) => c.value === category)?.description}
        </p>
      </div>

      {/* タイトル */}
      <div>
        <label
          htmlFor="title"
          className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]"
        >
          タイトル
          <span className="ml-1 text-[10px] text-[color:var(--ink-4)]">
            ({title.length} / 80)
          </span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={80}
          disabled={isPending}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：希望休の一括取消ボタンが欲しい"
          className="h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 text-[14px] text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      {/* 本文 */}
      <div>
        <label
          htmlFor="body"
          className="mb-2 block text-[12px] font-medium text-[color:var(--ink-2)]"
        >
          内容
          <span className="ml-1 text-[10px] text-[color:var(--ink-4)]">
            ({body.length} / 2000)
          </span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          maxLength={2000}
          rows={6}
          disabled={isPending}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="どんな状況で起きるか、どう動いてほしいかを具体的に書いてください"
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-3 text-[14px] leading-relaxed text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:bg-[color:var(--surface)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
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
        disabled={isPending || !title || !body}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] text-[14px] font-medium text-white shadow-[0_8px_20px_-6px_rgba(45,85,69,0.4)] transition-transform active:scale-[0.98] disabled:bg-[color:var(--ink-4)] disabled:shadow-none"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Send className="h-4 w-4" strokeWidth={1.8} />
        )}
        {isPending ? "送信中" : "送信する"}
      </button>
    </form>
  );
}
