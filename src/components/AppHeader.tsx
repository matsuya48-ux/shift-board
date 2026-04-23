/**
 * 全ページ共通のアプリヘッダー
 * - 左: アプリ名（BrandLogo／ダッシュボードへのリンク）＋ 本日の日付
 * - 右: 通知ベル ＋ スタッフアバター（選択画面へ）
 * - スクロール時も画面上部に追従（sticky）
 *
 * AppShell から呼び出され、認証済み全ページに表示される。
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionStaff } from "@/lib/staff-session";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatToday(now: Date) {
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日(${WEEKDAYS[now.getDay()]})`;
}

export async function AppHeader({ staff }: { staff: SessionStaff }) {
  const supabase = createAdminClient();
  const { count: notifCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("staff_id", staff.id)
    .eq("is_read", false);

  const firstWord = staff.display_name.split(/\s+/)[0] ?? "";
  const initial = firstWord.slice(0, 2) || "?";
  const today = formatToday(new Date());

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[color:var(--bg)]/90 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--bg)]/75">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-3 py-3">
        <Link
          href="/dashboard"
          aria-label="ダッシュボードへ"
          className="min-w-0 flex-1 active:opacity-70"
        >
          <BrandLogo size="lg" />
          <p className="mt-1 text-[11px] tabular-nums text-[color:var(--ink-3)]">
            {today}
          </p>
        </Link>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="通知"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] shadow-[var(--shadow-sm)] active:scale-95"
          >
            <Bell
              className="h-[18px] w-[18px] text-[color:var(--ink-2)]"
              strokeWidth={1.8}
            />
            {(notifCount ?? 0) > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[color:var(--danger)]" />
            )}
          </button>
          <Link
            href="/select-staff"
            aria-label="スタッフ切替"
            className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-[color:var(--accent)] px-2.5 text-[12px] font-semibold text-white active:scale-95"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
