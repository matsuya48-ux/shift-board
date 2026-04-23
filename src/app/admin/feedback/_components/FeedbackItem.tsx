"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Bug, MessageCircle, Trash2, Loader2 } from "lucide-react";
import {
  updateFeedbackStatus,
  updateFeedbackNote,
  deleteFeedback,
  type FeedbackStatus,
} from "../actions";

type Props = {
  id: string;
  category: "feature" | "bug" | "other";
  title: string;
  body: string;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  staff_name: string;
};

const CATEGORY_META = {
  feature: { label: "機能追加", Icon: Sparkles, color: "#2d5545" },
  bug: { label: "不具合", Icon: Bug, color: "#c24a4a" },
  other: { label: "その他", Icon: MessageCircle, color: "#5a7d9a" },
} as const;

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "未対応" },
  { value: "read", label: "確認済み" },
  { value: "done", label: "対応済み" },
  { value: "archived", label: "保留" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

export function FeedbackItem(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(props.admin_note ?? "");
  const [editingNote, setEditingNote] = useState(false);

  const meta = CATEGORY_META[props.category];
  const Icon = meta.Icon;

  function changeStatus(next: FeedbackStatus) {
    startTransition(async () => {
      await updateFeedbackStatus(props.id, next);
      router.refresh();
    });
  }

  function saveNote() {
    startTransition(async () => {
      await updateFeedbackNote(props.id, note);
      setEditingNote(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("このリクエストを削除しますか？（戻せません）")) return;
    startTransition(async () => {
      await deleteFeedback(props.id);
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: meta.color }}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-[11px] font-medium text-[color:var(--ink-2)]">
              {props.staff_name}
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-[color:var(--ink-4)]">
              {formatDate(props.created_at)}
            </span>
          </div>
          <p className="mt-2 text-[14px] font-semibold leading-tight text-[color:var(--ink)]">
            {props.title}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-[color:var(--ink-2)]">
            {props.body}
          </p>

          {/* ステータス変更 */}
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {STATUS_OPTIONS.map((opt) => {
              const active = props.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isPending || active}
                  onClick={() => changeStatus(opt.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-[color:var(--accent)] text-white"
                      : "bg-[color:var(--bg)] text-[color:var(--ink-3)] active:scale-95"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              aria-label="削除"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--ink-3)] active:bg-[color:var(--bg)]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>

          {/* 管理者メモ */}
          {editingNote ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="送信者に返信するメモ（送信者ページにも表示されます）"
                className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-[12px] leading-relaxed text-[color:var(--ink)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={isPending}
                  className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-[color:var(--accent)] text-[12px] font-medium text-white active:scale-95 disabled:bg-[color:var(--ink-4)]"
                >
                  {isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                  )}
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNote(props.admin_note ?? "");
                    setEditingNote(false);
                  }}
                  disabled={isPending}
                  className="h-9 rounded-full bg-[color:var(--bg)] px-4 text-[12px] font-medium text-[color:var(--ink-3)] active:scale-95"
                >
                  取消
                </button>
              </div>
            </div>
          ) : props.admin_note ? (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="mt-3 block w-full rounded-xl bg-[color:var(--accent-soft)] p-2.5 text-left active:opacity-70"
            >
              <p className="text-[10px] font-semibold text-[color:var(--accent)]">
                管理者メモ（タップで編集）
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[color:var(--ink-2)]">
                {props.admin_note}
              </p>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="mt-3 text-[11px] font-medium text-[color:var(--accent)] active:opacity-70"
            >
              ＋ 管理者メモを追加
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
