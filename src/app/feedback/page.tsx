import Link from "next/link";
import { ArrowLeft, Sparkles, Bug, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackForm } from "./_components/FeedbackForm";

type FeedbackRow = {
  id: string;
  category: "feature" | "bug" | "other";
  title: string;
  body: string;
  status: "new" | "read" | "done" | "archived";
  admin_note: string | null;
  created_at: string;
};

const CATEGORY_META = {
  feature: { label: "機能追加", Icon: Sparkles, color: "#2d5545" },
  bug: { label: "不具合", Icon: Bug, color: "#c24a4a" },
  other: { label: "その他", Icon: MessageCircle, color: "#5a7d9a" },
} as const;

const STATUS_LABEL = {
  new: "未対応",
  read: "確認済み",
  done: "対応済み",
  archived: "保留",
} as const;

function formatShortDate(iso: string) {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

export default async function FeedbackPage() {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();

  const { data: myRequests } = await supabase
    .from("feature_requests")
    .select("id, category, title, body, status, admin_note, created_at")
    .eq("staff_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const requests = (myRequests ?? []) as FeedbackRow[];

  return (
    <AppShell>
      <div className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 px-3 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          ホーム
        </Link>

        <header className="mb-6 mt-5 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Feedback
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            開発者へリクエスト
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-3)]">
            「こうなったら便利」を送ってください。内容は管理者のみが確認します。
          </p>
        </header>

        {/* フォームカード */}
        <section className="mx-3 mb-8 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <FeedbackForm />
        </section>

        {/* 過去の送信 */}
        {requests.length > 0 && (
          <section className="px-3">
            <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--ink-2)]">
              あなたの送信履歴（{requests.length}件）
            </h2>
            <ul className="space-y-2">
              {requests.map((r) => {
                const meta = CATEGORY_META[r.category];
                const Icon = meta.Icon;
                return (
                  <li
                    key={r.id}
                    className="rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: meta.color }}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ background: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              r.status === "done"
                                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                                : r.status === "archived"
                                  ? "bg-[color:var(--bg)] text-[color:var(--ink-4)]"
                                  : r.status === "read"
                                    ? "bg-[#eef3f7] text-[#3a5a7a]"
                                    : "bg-[#fdf5e6] text-[color:var(--warning)]"
                            }`}
                          >
                            {STATUS_LABEL[r.status]}
                          </span>
                          <span className="ml-auto text-[10px] tabular-nums text-[color:var(--ink-4)]">
                            {formatShortDate(r.created_at)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[13px] font-semibold leading-tight text-[color:var(--ink)]">
                          {r.title}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-[color:var(--ink-3)]">
                          {r.body}
                        </p>
                        {r.admin_note && (
                          <div className="mt-2 rounded-xl bg-[color:var(--accent-soft)] p-2.5">
                            <p className="text-[10px] font-semibold text-[color:var(--accent)]">
                              管理者より
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-[color:var(--ink-2)]">
                              {r.admin_note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
