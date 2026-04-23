import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import {
  Users,
  CalendarHeart,
  CalendarClock,
  ChevronRight,
  ArrowLeft,
  Settings2,
  Printer,
} from "lucide-react";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [
    { count: staffCount },
    { count: pendingTimeOffCount },
    { count: todayShiftCount },
  ] = await Promise.all([
    supabase
      .from("staffs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("time_off_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("shifts")
      .select("*", { count: "exact", head: true })
      .eq("work_date", new Date().toISOString().split("T")[0]),
  ]);

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[14px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          ホームに戻る
        </Link>

        <header className="mb-8 mt-5">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
            管理メニュー
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ink-3)]">
            シフトとスタッフを管理します
          </p>
        </header>

        {/* 状況サマリー */}
        <div className="mb-8 grid grid-cols-3 gap-2.5">
          <StatCard
            label="スタッフ"
            value={staffCount ?? 0}
            unit="人"
            color="var(--accent)"
          />
          <StatCard
            label="申請中"
            value={pendingTimeOffCount ?? 0}
            unit="件"
            color="var(--warning)"
          />
          <StatCard
            label="本日出勤"
            value={todayShiftCount ?? 0}
            unit="件"
            color="var(--ink)"
          />
        </div>

        {/* メインメニュー（大きめ） */}
        <p className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          よく使うメニュー
        </p>
        <section className="mb-7 space-y-3">
          <PrimaryMenuCard
            href="/admin/shifts"
            title="シフトを作る"
            subtitle="ボード／スタッフ別／自動提案"
            Icon={CalendarClock}
            accent
          />
          <PrimaryMenuCard
            href="/admin/time-off"
            title="希望休を見る"
            subtitle={
              (pendingTimeOffCount ?? 0) > 0
                ? `${pendingTimeOffCount} 件の申請があります`
                : "未処理なし"
            }
            Icon={CalendarHeart}
            badge={pendingTimeOffCount ?? 0}
          />
          <PrimaryMenuCard
            href="/admin/staffs"
            title="スタッフを見る"
            subtitle={`登録済み ${staffCount ?? 0} 名`}
            Icon={Users}
          />
        </section>

        {/* 補助メニュー */}
        <p className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          その他
        </p>
        <section className="space-y-3">
          <SecondaryMenuCard
            href="/admin/settings"
            title="設定"
            subtitle="お知らせ・パターン・イベント など"
            Icon={Settings2}
          />
          <SecondaryMenuCard
            href="/admin/print"
            title="印刷"
            subtitle="A4のシフト表を印刷"
            Icon={Printer}
          />
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-stretch gap-2.5 rounded-2xl bg-[color:var(--surface)] py-4 pl-4 pr-4 shadow-[var(--shadow-sm)]">
      <div
        className="w-1 flex-shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-[color:var(--ink-3)]">
          {label}
        </p>
        <p className="mt-2 flex items-baseline gap-1">
          <span className="text-[22px] font-semibold leading-none tabular-nums tracking-tight text-[color:var(--ink)]">
            {value}
          </span>
          <span className="text-[11px] text-[color:var(--ink-3)]">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function PrimaryMenuCard({
  href,
  title,
  subtitle,
  Icon,
  badge,
  accent = false,
}: {
  href: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl p-5 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98] ${
        accent
          ? "bg-gradient-to-br from-[color:var(--accent)] to-[#1f3e31] text-white shadow-[var(--shadow-md)]"
          : "bg-[color:var(--surface)] text-[color:var(--ink)]"
      }`}
    >
      <div
        className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${
          accent
            ? "bg-white/15 backdrop-blur"
            : "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
        }`}
      >
        <Icon className={accent ? "h-7 w-7" : "h-6 w-6"} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={`truncate text-[16px] font-semibold tracking-tight ${
            accent ? "text-white" : "text-[color:var(--ink)]"
          }`}
        >
          {title}
        </p>
        <p
          className={`truncate text-[12px] ${
            accent ? "text-white/80" : "text-[color:var(--ink-3)]"
          }`}
        >
          {subtitle}
        </p>
      </div>
      {badge && badge > 0 ? (
        <span className="flex h-8 min-w-[2rem] flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--warning)] px-2.5 text-[14px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      <ChevronRight
        className={`h-5 w-5 flex-shrink-0 ${
          accent ? "text-white/70" : "text-[color:var(--ink-4)]"
        }`}
        strokeWidth={2}
      />
    </Link>
  );
}

function SecondaryMenuCard({
  href,
  title,
  subtitle,
  Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98]"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--bg)] text-[color:var(--ink-2)]">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-[14px] font-semibold tracking-tight text-[color:var(--ink)]">
          {title}
        </p>
        <p className="truncate text-[11px] text-[color:var(--ink-3)]">
          {subtitle}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 flex-shrink-0 text-[color:var(--ink-4)]"
        strokeWidth={2}
      />
    </Link>
  );
}
