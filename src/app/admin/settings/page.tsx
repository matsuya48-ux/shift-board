import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeft,
  ChevronRight,
  Megaphone,
  Clock,
  Calendar,
  Tag,
  CalendarClock,
  Sparkles,
} from "lucide-react";

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-2 pb-8 pt-6 sm:px-3 md:px-4 landscape:px-0 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-[14px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          管理メニュー
        </Link>

        <header className="mb-8 mt-5">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
            設定
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ink-3)]">
            シフト作成前にあらかじめ登録しておく情報です
          </p>
        </header>

        <p className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          スタッフへのお知らせ
        </p>
        <section className="mb-6 space-y-3">
          <MenuItem
            href="/admin/announcements"
            title="お知らせ"
            subtitle="スタッフのホーム画面に表示するメッセージ"
            Icon={Megaphone}
          />
        </section>

        <p className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          シフトの雛形
        </p>
        <section className="mb-6 space-y-3">
          <MenuItem
            href="/admin/patterns"
            title="シフトパターン"
            subtitle="早番・遅番などの時間帯を登録"
            Icon={Clock}
          />
          <MenuItem
            href="/admin/shifts/auto"
            title="シフト自動提案"
            subtitle="月の下書きを一括で作成"
            Icon={Sparkles}
          />
        </section>

        <p className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          カレンダーの目印
        </p>
        <section className="space-y-3">
          <MenuItem
            href="/admin/events"
            title="日付イベント"
            subtitle="セール・荷物入荷など特定日"
            Icon={Calendar}
          />
          <MenuItem
            href="/admin/weekday-labels"
            title="曜日ラベル"
            subtitle="事業部の出荷日など曜日ごと"
            Icon={Tag}
          />
          <MenuItem
            href="/admin/label-overrides"
            title="曜日ラベルの例外"
            subtitle="今週だけスキップ／別日にずらす"
            Icon={CalendarClock}
          />
        </section>
      </div>
    </AppShell>
  );
}

function MenuItem({
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
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-[15px] font-semibold tracking-tight text-[color:var(--ink)]">
          {title}
        </p>
        <p className="truncate text-[12px] text-[color:var(--ink-3)]">
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
