import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BulkDeleteForm } from "./_components/BulkDeleteForm";

export const dynamic = "force-dynamic";

export default async function BulkDeleteShiftsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .order("name");

  // 今月をデフォルト
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <AppShell>
      <div className="mx-auto w-full px-0 pb-8 pt-6 sm:max-w-2xl animate-rise">
        <Link
          href="/admin/shifts"
          className="inline-flex items-center gap-1 px-3 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          シフト作成メニュー
        </Link>

        <header className="mb-6 mt-5 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--danger)]">
            Bulk delete
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            シフト一括削除
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-3)]">
            指定した月のシフトを一括削除します。元に戻せません。
          </p>
        </header>

        <section className="mx-3 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <BulkDeleteForm
            warehouses={warehouses ?? []}
            defaultMonth={defaultMonth}
          />
        </section>
      </div>
    </AppShell>
  );
}
