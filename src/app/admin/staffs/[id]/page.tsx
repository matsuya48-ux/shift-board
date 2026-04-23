import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft } from "lucide-react";
import { StaffForm } from "../_components/StaffForm";
import { updateStaff } from "../actions";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = createAdminClient();

  const [{ data: staff }, { data: warehouses }] = await Promise.all([
    supabase
      .from("staffs")
      .select(
        "id, display_name, warehouse_id, role, employment_type, weekly_hour_limit, preferred_start_time, preferred_end_time, shift_style, is_active",
      )
      .eq("id", id)
      .single(),
    supabase.from("warehouses").select("id, name").order("name"),
  ]);

  if (!staff) notFound();

  const boundUpdate = async (formData: FormData) => {
    "use server";
    return updateStaff(id, formData);
  };

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-2 pb-8 pt-6 sm:px-3 md:px-4 landscape:px-0 sm:max-w-2xl animate-rise"
      >
        <Link
          href="/admin/staffs"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          スタッフ一覧
        </Link>

        <header className="mb-6 mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-lg font-semibold uppercase text-[color:var(--accent)]">
            {staff.display_name[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
              Staff Detail
            </p>
            <h1 className="mt-1 truncate text-[22px] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
              {staff.display_name}
            </h1>
          </div>
        </header>

        <section className="rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <StaffForm
            mode="edit"
            warehouses={warehouses ?? []}
            initial={staff}
            action={boundUpdate}
            redirectTo="/admin/staffs"
          />
        </section>
      </div>
    </AppShell>
  );
}
