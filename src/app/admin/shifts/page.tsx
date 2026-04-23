import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, ChevronRight, Search, Sparkles, Grid3x3 } from "lucide-react";

export default async function AdminShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = createAdminClient();

  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .order("name");

  let query = supabase
    .from("staffs")
    .select(
      "id, display_name, weekly_hour_limit, employment_type, warehouse_id, warehouses(name)",
    )
    .eq("is_active", true)
    .order("display_name");

  if (params.warehouse) query = query.eq("warehouse_id", params.warehouse);

  const { data: staffsRaw } = await query;
  const staffs = (staffsRaw ?? []) as unknown as {
    id: string;
    display_name: string;
    weekly_hour_limit: number | null;
    employment_type: string;
    warehouse_id: string;
    warehouses: { name: string } | null;
  }[];

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

        <header className="mb-5 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Shift Editor
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            シフト作成
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            スタッフを選んでシフトを登録・編集します
          </p>
        </header>

        {/* 自動提案 */}
        <Link
          href="/admin/shifts/auto"
          className="mb-3 flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-[color:var(--accent)] to-[#1f3e31] p-4 text-white shadow-[var(--shadow-md)] transition-transform active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[14px] font-semibold leading-snug">
              シフトを自動提案
            </p>
            <p className="truncate text-[11px] leading-snug text-white/70">
              希望時間帯・週上限を元に一括作成
            </p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/70" strokeWidth={2} />
        </Link>

        {/* ボードで編集 */}
        <Link
          href="/admin/shifts/board"
          className="mb-4 flex items-center gap-3.5 rounded-2xl bg-[color:var(--ink)] p-4 text-white shadow-[var(--shadow-md)] transition-transform active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Grid3x3 className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[14px] font-semibold leading-snug">
              ボードで編集
            </p>
            <p className="truncate text-[11px] leading-snug text-white/70">
              月カレンダーのセルを直接タップして編集
            </p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/70" strokeWidth={2} />
        </Link>

        {/* 拠点フィルタ */}
        {warehouses && warehouses.length > 0 && (
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
            <Link
              href="/admin/shifts"
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
                  href={`/admin/shifts?warehouse=${wh.id}`}
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

        {staffs.length === 0 ? (
          <div className="rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
            <Search
              className="mx-auto mb-3 h-6 w-6 text-[color:var(--ink-4)]"
              strokeWidth={1.8}
            />
            <p className="text-[14px] font-medium text-[color:var(--ink-2)]">
              スタッフがいません
            </p>
            <p className="mt-1 text-[12px] text-[color:var(--ink-3)]">
              先に「スタッフ管理」から登録してください
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {staffs.map((s) => (
              <Link
                key={s.id}
                href={`/admin/shifts/${s.id}`}
                className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-sm font-semibold uppercase text-[color:var(--accent)]">
                  {s.display_name[0] ?? "?"}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-[14px] font-semibold text-[color:var(--ink)]">
                    {s.display_name}
                  </p>
                  <p className="truncate text-[11px] text-[color:var(--ink-3)]">
                    {s.warehouses?.name ?? "—"}
                    {s.weekly_hour_limit && (
                      <>
                        <span className="mx-1.5">・</span>
                        週 {s.weekly_hour_limit}h
                      </>
                    )}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 flex-shrink-0 text-[color:var(--ink-4)]"
                  strokeWidth={2}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
