import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, ChevronRight, Search, StickyNote } from "lucide-react";

type Staff = {
  id: string;
  display_name: string;
  employee_code: string | null;
  role: "staff" | "admin";
  employment_type: "full" | "part" | "contract" | "short";
  weekly_hour_limit: number | null;
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  is_active: boolean;
  admin_note: string | null;
  warehouses: { name: string } | null;
};

const EMPLOYMENT_LABEL = {
  full: "正社員",
  part: "パート",
  contract: "契約",
  short: "短時間社員",
};

export default async function AdminStaffsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string; show?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const showInactive = params.show === "all";

  const supabase = createAdminClient();

  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .order("name");

  let query = supabase
    .from("staffs")
    .select(
      "id, display_name, employee_code, role, employment_type, weekly_hour_limit, preferred_start_time, preferred_end_time, is_active, admin_note, warehouses(name), warehouse_id",
    )
    .order("is_active", { ascending: false })
    .order("employee_code", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true });

  if (params.warehouse) {
    query = query.eq("warehouse_id", params.warehouse);
  }
  if (!showInactive) {
    query = query.eq("is_active", true);
  }

  const { data: staffsRaw } = await query;
  // 社員コードを数値として昇順ソート（DBのtext型ソートだと "1029" < "799" になるため）
  const staffs = ((staffsRaw ?? []) as unknown as (Staff & {
    warehouse_id: string;
  })[])
    .slice()
    .sort((a, b) => {
      // is_active 降順を維持
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      const aCode = a.employee_code ?? "";
      const bCode = b.employee_code ?? "";
      if (aCode && bCode)
        return aCode.localeCompare(bCode, "ja", { numeric: true });
      if (aCode) return -1;
      if (bCode) return 1;
      return a.display_name.localeCompare(b.display_name, "ja");
    });

  // カウント用クエリ（拠点フィルタを反映）
  let totalQ = supabase
    .from("staffs")
    .select("*", { count: "exact", head: true });
  let activeQ = supabase
    .from("staffs")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (params.warehouse) {
    totalQ = totalQ.eq("warehouse_id", params.warehouse);
    activeQ = activeQ.eq("warehouse_id", params.warehouse);
  }
  const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
    totalQ,
    activeQ,
  ]);
  const activeCountForLabel = activeCount ?? 0;
  const totalCountForLabel = totalCount ?? 0;

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          管理者メニュー
        </Link>

        <header className="mb-6 mt-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
              Staff
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
              スタッフ管理
            </h1>
            <p className="mt-1.5 text-[13px] text-[color:var(--ink-3)]">
              在籍 {activeCountForLabel} 名 / 全 {totalCountForLabel} 名
            </p>
          </div>
        </header>

        {/* 拠点フィルタ */}
        {warehouses && warehouses.length > 0 && (
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
            <Link
              href="/admin/staffs"
              className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                !params.warehouse
                  ? "bg-[color:var(--accent)] text-white"
                  : "text-[color:var(--ink-3)]"
              }`}
            >
              すべて
            </Link>
            {warehouses.map((wh) => {
              const active = params.warehouse === wh.id;
              return (
                <Link
                  key={wh.id}
                  href={`/admin/staffs?warehouse=${wh.id}`}
                  className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                    active
                      ? "bg-[color:var(--accent)] text-white"
                      : "text-[color:var(--ink-3)]"
                  }`}
                >
                  {wh.name.replace("物流倉庫", "")}
                </Link>
              );
            })}
          </div>
        )}

        {/* 表示切替（在籍中 / すべて） */}
        <div className="mb-3 flex gap-1 rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
          <Link
            href={`/admin/staffs${params.warehouse ? `?warehouse=${params.warehouse}` : ""}`}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
              !showInactive
                ? "bg-[color:var(--accent)] text-white"
                : "text-[color:var(--ink-3)]"
            }`}
          >
            在籍中のみ
          </Link>
          <Link
            href={`/admin/staffs?show=all${params.warehouse ? `&warehouse=${params.warehouse}` : ""}`}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
              showInactive
                ? "bg-[color:var(--accent)] text-white"
                : "text-[color:var(--ink-3)]"
            }`}
          >
            すべて（無効含む）
          </Link>
        </div>

        {/* 新規登録 */}
        <Link
          href="/admin/staffs/new"
          className="mb-4 flex items-center justify-center gap-1.5 rounded-full bg-[color:var(--ink)] py-3 text-[13px] font-medium text-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.3)] transition-transform active:scale-[0.98]"
        >
          ＋ スタッフを新規登録
        </Link>

        {staffs.length === 0 ? (
          <div className="rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
            <Search
              className="mx-auto mb-3 h-6 w-6 text-[color:var(--ink-4)]"
              strokeWidth={1.8}
            />
            <p className="text-[14px] font-medium text-[color:var(--ink-2)]">
              スタッフが登録されていません
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {staffs.map((s) => (
              <StaffCard key={s.id} staff={s} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StaffCard({ staff }: { staff: Staff }) {
  const firstChar = staff.display_name[0] ?? "?";

  return (
    <Link
      href={`/admin/staffs/${staff.id}`}
      className={`flex items-center gap-3 rounded-2xl p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98] ${
        staff.is_active
          ? "bg-[color:var(--surface)]"
          : "bg-[color:var(--bg)] opacity-60"
      }`}
    >
      <div
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase ${
          staff.role === "admin"
            ? "bg-[color:var(--ink)] text-white"
            : "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
        }`}
      >
        {firstChar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
            {staff.display_name}
          </p>
          {staff.role === "admin" && (
            <span className="flex-shrink-0 rounded-full bg-[color:var(--ink)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          )}
          {!staff.is_active && (
            <span className="flex-shrink-0 rounded-full bg-[color:var(--ink-4)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
              無効
            </span>
          )}
          {staff.admin_note && (
            <span
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
              title="管理者メモあり"
            >
              <StickyNote className="h-2.5 w-2.5" strokeWidth={2} />
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-[color:var(--ink-3)]">
          {staff.employee_code && (
            <>
              <span className="tabular-nums font-medium text-[color:var(--ink-2)]">
                {staff.employee_code}
              </span>
              <span className="mx-1.5">・</span>
            </>
          )}
          {staff.warehouses?.name ?? "—"}
          <span className="mx-1.5">・</span>
          {EMPLOYMENT_LABEL[staff.employment_type]}
          {staff.weekly_hour_limit && (
            <>
              <span className="mx-1.5">・</span>
              週 {staff.weekly_hour_limit}h
            </>
          )}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 flex-shrink-0 text-[color:var(--ink-4)]"
        strokeWidth={2}
      />
    </Link>
  );
}
