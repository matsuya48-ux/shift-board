import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "./_components/EventForm";
import { EventList } from "./_components/EventList";

type EventRow = {
  id: string;
  warehouse_id: string;
  event_date: string;
  title: string;
  description: string | null;
  color: string | null;
  warehouses: { name: string } | null;
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = createAdminClient();

  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .order("name");

  let q = supabase
    .from("warehouse_events")
    .select("*, warehouses(name)")
    .gte("event_date", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split("T")[0])
    .order("event_date");
  if (sp.warehouse) q = q.eq("warehouse_id", sp.warehouse);

  const { data: events } = await q;

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
            Events
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            日付イベント
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            ECセールや荷物の受入など、特定の日付に紐づくイベントを管理します。
            シフト表の日付の上に表示されます。
          </p>
        </header>

        <section className="mb-6 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-[14px] font-semibold text-[color:var(--ink)]">
            新規追加
          </h2>
          <EventForm warehouses={warehouses ?? []} />
        </section>

        <h2 className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          登録済みイベント（過去30日〜未来）
        </h2>
        <EventList events={(events as EventRow[]) ?? []} />
      </div>
    </AppShell>
  );
}
