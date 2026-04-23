import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import { PatternsManager } from "./_components/PatternsManager";

type Pattern = {
  id: string;
  warehouse_id: string;
  code: string;
  label: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  color: string | null;
};

export default async function PatternsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: warehouses }, { data: patterns }] = await Promise.all([
    supabase.from("warehouses").select("id, name").order("name"),
    supabase
      .from("shift_patterns")
      .select("*")
      .order("warehouse_id")
      .order("start_time"),
  ]);

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

        <header className="mb-6 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Shift Patterns
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            シフトパターン
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            「早番」「遅番」など、拠点ごとによく使うシフトを登録します
          </p>
        </header>

        <PatternsManager
          warehouses={warehouses ?? []}
          patterns={(patterns as Pattern[]) ?? []}
        />
      </div>
    </AppShell>
  );
}
