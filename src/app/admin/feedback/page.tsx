import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackItem } from "./_components/FeedbackItem";

type FeedbackRow = {
  id: string;
  staff_id: string;
  category: "feature" | "bug" | "other";
  title: string;
  body: string;
  status: "new" | "read" | "done" | "archived";
  admin_note: string | null;
  created_at: string;
  staffs: { display_name: string } | null;
};

type FilterStatus = "all" | "open" | "new" | "read" | "done" | "archived";

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "open", label: "対応中" },
  { value: "new", label: "未対応" },
  { value: "read", label: "確認済み" },
  { value: "done", label: "対応済み" },
  { value: "archived", label: "保留" },
  { value: "all", label: "すべて" },
];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: FilterStatus }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: FilterStatus = sp.status ?? "open";
  const supabase = createAdminClient();

  let query = supabase
    .from("feature_requests")
    .select(
      "id, staff_id, category, title, body, status, admin_note, created_at, staffs(display_name)",
    )
    .order("created_at", { ascending: false });

  if (filter === "open") {
    query = query.in("status", ["new", "read"]);
  } else if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: rowsRaw } = await query;
  const rows = (rowsRaw ?? []) as unknown as FeedbackRow[];

  // ステータス別件数（バッジ表示用）
  const { data: counts } = await supabase
    .from("feature_requests")
    .select("status");
  const statusCount: Record<string, number> = {};
  (counts ?? []).forEach((c: { status: string }) => {
    statusCount[c.status] = (statusCount[c.status] ?? 0) + 1;
  });
  const openCount = (statusCount.new ?? 0) + (statusCount.read ?? 0);

  return (
    <AppShell>
      <div className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 px-3 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          管理者メニュー
        </Link>

        <header className="mb-5 mt-5 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Feedback
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            機能リクエスト
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-3)]">
            スタッフからの要望・不具合報告を確認できます
            {openCount > 0 && (
              <span className="ml-1 inline-flex items-center rounded-full bg-[color:var(--warning)] px-2 py-0.5 text-[10px] font-semibold text-white">
                対応中 {openCount} 件
              </span>
            )}
          </p>
        </header>

        {/* フィルタ */}
        <div className="mb-4 flex gap-1 overflow-x-auto px-3">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count =
              f.value === "all"
                ? undefined
                : f.value === "open"
                  ? openCount
                  : (statusCount[f.value] ?? 0);
            return (
              <Link
                key={f.value}
                href={`?status=${f.value}`}
                className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-[color:var(--accent)] text-white"
                    : "bg-[color:var(--surface)] text-[color:var(--ink-3)] shadow-[var(--shadow-sm)]"
                }`}
              >
                {f.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`ml-1.5 tabular-nums ${
                      active ? "text-white/80" : "text-[color:var(--ink-4)]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <div className="mx-3 rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[14px] font-medium text-[color:var(--ink-2)]">
              該当するリクエストはありません
            </p>
          </div>
        ) : (
          <ul className="space-y-2 px-3">
            {rows.map((r) => (
              <FeedbackItem
                key={r.id}
                id={r.id}
                category={r.category}
                title={r.title}
                body={r.body}
                status={r.status}
                admin_note={r.admin_note}
                created_at={r.created_at}
                staff_name={r.staffs?.display_name ?? "（不明）"}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
