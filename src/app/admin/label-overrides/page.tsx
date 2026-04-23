import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, Info } from "lucide-react";
import { OverrideForm } from "./_components/OverrideForm";
import { OverrideList } from "./_components/OverrideList";

type OverrideRow = {
  id: string;
  warehouse_id: string;
  override_date: string;
  label: string;
  action: "add" | "skip";
  color: string | null;
  note: string | null;
  warehouses: { name: string } | null;
};

type WeekdayLabel = {
  id: string;
  warehouse_id: string;
  weekday: number;
  label: string;
  color: string | null;
};

export default async function LabelOverridesPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: warehouses }, { data: weekdayLabels }, { data: overrides }] =
    await Promise.all([
      supabase.from("warehouses").select("id, name").order("name"),
      supabase.from("warehouse_weekday_labels").select("*").order("weekday"),
      supabase
        .from("warehouse_date_label_overrides")
        .select("*, warehouses(name)")
        .gte(
          "override_date",
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
            .toISOString()
            .split("T")[0],
        )
        .order("override_date"),
    ]);

  return (
    <AppShell>
      <div
        style={{
          width: "100%",
          maxWidth: "32rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "2.25rem",
          paddingRight: "2.25rem",
          paddingTop: "1.75rem",
          paddingBottom: "2rem",
          boxSizing: "border-box",
        }}
        className="animate-rise"
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
            Label Overrides
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            曜日ラベルの例外
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            「今週のフェミなし」「今週の CL は水曜」など、特定の日だけ通常の曜日ラベルを変更します
          </p>
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[color:var(--accent-soft)] p-5">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]">
            <Info className="h-3 w-3 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 text-[12px] leading-relaxed text-[color:var(--ink-2)]">
            <p>
              <strong>スキップ</strong>：その日の通常ラベルを非表示にします（例：「今週のフェミなし」→ 該当水曜にフェミをスキップ）
            </p>
            <p>
              <strong>追加</strong>：通常は無い日にラベルを追加します（例：「今週のフェミは木曜」→ 該当木曜にフェミを追加）
            </p>
          </div>
        </div>

        <section className="mb-6 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-[14px] font-semibold text-[color:var(--ink)]">
            新規追加
          </h2>
          <OverrideForm
            warehouses={warehouses ?? []}
            weekdayLabels={(weekdayLabels as WeekdayLabel[]) ?? []}
          />
        </section>

        <h2 className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          登録済みの例外（過去30日〜未来）
        </h2>
        <OverrideList overrides={(overrides as OverrideRow[]) ?? []} />
      </div>
    </AppShell>
  );
}
