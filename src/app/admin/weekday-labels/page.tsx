import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import { WeekdayLabelForm } from "./_components/WeekdayLabelForm";
import { WeekdayLabelList } from "./_components/WeekdayLabelList";

type LabelRow = {
  id: string;
  warehouse_id: string;
  weekday: number;
  label: string;
  color: string | null;
  warehouses: { name: string } | null;
};

export default async function WeekdayLabelsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: warehouses }, { data: labels }] = await Promise.all([
    supabase.from("warehouses").select("id, name").order("name"),
    supabase
      .from("warehouse_weekday_labels")
      .select("*, warehouses(name)")
      .order("warehouse_id")
      .order("weekday")
      .order("sort_order"),
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
            Weekday Labels
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            曜日ラベル
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            曜日ごとに繰り返し表示されるラベル（本部の事業部出荷日など）を設定します。
            例：火=CL、水=フェミ、木=デイ
          </p>
        </header>

        <section className="mb-6 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-[14px] font-semibold text-[color:var(--ink)]">
            新規追加
          </h2>
          <WeekdayLabelForm warehouses={warehouses ?? []} />
        </section>

        <h2 className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          登録済みラベル
        </h2>
        <WeekdayLabelList labels={(labels as LabelRow[]) ?? []} />
      </div>
    </AppShell>
  );
}
