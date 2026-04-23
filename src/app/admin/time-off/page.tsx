import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import { RequestItem } from "./_components/RequestItem";
import { ApproveAllButton } from "./_components/ApproveAllButton";
import { UnsubmittedStaffList } from "./_components/UnsubmittedStaffList";
import { nextMonthRange } from "@/lib/time-off-reminder";

type Req = {
  id: string;
  request_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  admin_note: string | null;
  staffs: {
    display_name: string;
    warehouses: { name: string } | null;
  } | null;
};

export default async function AdminTimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filter = params.filter ?? "pending";

  const supabase = createAdminClient();

  let query = supabase
    .from("time_off_requests")
    .select(
      "id, request_date, reason, status, submitted_at, admin_note, staffs(display_name, warehouses(name))",
    )
    .order("request_date", { ascending: true });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: requests } = await query;

  // 申請中件数（タブに関係なくカウント）
  const { count: pendingCount } = await supabase
    .from("time_off_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // 未提出スタッフ（翌月分）
  const { start, end } = nextMonthRange();
  const [{ data: activeStaffs }, { data: submittedIds }] = await Promise.all([
    supabase
      .from("staffs")
      .select("id, display_name, warehouses(name), warehouse_id")
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("time_off_requests")
      .select("staff_id")
      .gte("request_date", start)
      .lte("request_date", end),
  ]);
  const submittedSet = new Set(
    (submittedIds ?? []).map((r) => r.staff_id),
  );
  const unsubmitted = (activeStaffs ?? []).filter(
    (s) => !submittedSet.has(s.id as string),
  );

  const tabs = [
    { key: "pending", label: "申請中" },
    { key: "approved", label: "承認" },
    { key: "rejected", label: "却下" },
    { key: "all", label: "すべて" },
  ];

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-2 pb-8 pt-6 sm:px-3 md:px-4 landscape:px-3 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          管理者メニュー
        </Link>

        <header className="mb-6 mt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Time off · Admin
          </p>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
            希望休の承認
          </h1>
          <p className="mt-1.5 text-[13px] text-[color:var(--ink-3)]">
            スタッフから申請された希望休を確認します
          </p>
        </header>

        {/* 未提出スタッフ */}
        <UnsubmittedStaffList
          staffs={
            unsubmitted as unknown as {
              id: string;
              display_name: string;
              warehouses: { name: string } | null;
            }[]
          }
          monthLabel={`${new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2}月`}
        />

        {/* タブ */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/admin/time-off?filter=${tab.key}`}
                className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--ink-3)] hover:text-[color:var(--ink)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* 申請中タブ時：一括承認ボタン */}
        {filter === "pending" && (
          <ApproveAllButton count={pendingCount ?? 0} />
        )}

        {(!requests || requests.length === 0) && (
          <div className="rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[14px] font-medium text-[color:var(--ink-2)]">
              申請はありません
            </p>
            <p className="mt-1 text-[12px] text-[color:var(--ink-3)]">
              {filter === "pending"
                ? "未処理の希望休はありません"
                : "該当する申請がありません"}
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {(requests as unknown as Req[] | null)?.map((req) => (
            <RequestItem key={req.id} request={req} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
