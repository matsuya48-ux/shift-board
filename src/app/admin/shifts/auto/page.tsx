import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, Info } from "lucide-react";
import { AutoSuggestForm } from "./_components/AutoSuggestForm";

export default async function AutoSuggestPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .order("name");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/admin/shifts"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          シフト編集に戻る
        </Link>

        <header className="mb-6 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            Auto Suggest
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            シフト自動提案
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            スタッフの希望時間帯・週上限を踏まえて、月曜〜金曜のシフトを下書きで一括作成します
          </p>
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[color:var(--accent-soft)] p-5">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]">
            <Info className="h-3 w-3 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 text-[12px] leading-relaxed">
            <p className="font-semibold text-[color:var(--ink)]">
              提案のルール
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-[color:var(--ink-2)]">
              <li>月曜〜金曜のみ対象（土日は自動作成されません）</li>
              <li>既にシフトが入っている日はスキップ</li>
              <li>承認済み／申請中の希望休がある日はスキップ</li>
              <li>希望時間帯に合うパターンがあれば自動選択、無ければ直接時刻指定</li>
              <li>週上限時間を超えないよう調整</li>
              <li>作成されるシフトは<strong>下書き状態</strong>（未公開）</li>
            </ul>
          </div>
        </div>

        <section className="rounded-3xl bg-[color:var(--surface)] p-7 shadow-[var(--shadow-sm)]">
          <AutoSuggestForm
            warehouses={warehouses ?? []}
            defaultMonth={defaultMonth}
            nextMonthStr={nextMonthStr}
          />
        </section>
      </div>
    </AppShell>
  );
}
