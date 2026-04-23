import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, Info } from "lucide-react";
import { StaffForm } from "../_components/StaffForm";
import { createStaff } from "../actions";

export default async function NewStaffPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name")
    .order("name");

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
          href="/admin/staffs"
          className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          スタッフ一覧
        </Link>

        <header className="mb-6 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
            New Staff
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            スタッフ新規登録
          </h1>
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[color:var(--accent-soft)] p-5">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]">
            <Info className="h-3 w-3 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-1 text-[12px] leading-relaxed">
            <p className="font-semibold text-[color:var(--ink)]">
              名前を入力するだけで登録できます
            </p>
            <p className="text-[color:var(--ink-2)]">
              登録後、スタッフはトップ画面の「スタッフ選択」で自分の名前を選んでアクセスできるようになります。
            </p>
          </div>
        </div>

        <section className="rounded-3xl bg-[color:var(--surface)] p-7 shadow-[var(--shadow-sm)]">
          <StaffForm
            mode="create"
            warehouses={warehouses ?? []}
            action={createStaff}
            redirectTo="/admin/staffs"
          />
        </section>
      </div>
    </AppShell>
  );
}
