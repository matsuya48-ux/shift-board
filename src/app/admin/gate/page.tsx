import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentStaff } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, KeyRound } from "lucide-react";
import { PinForm } from "./_components/PinForm";

export default async function AdminGatePage() {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/select-staff");
  if (staff.role !== "admin") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("staffs")
    .select("admin_pin")
    .eq("id", staff.id)
    .single();

  const mode: "verify" | "setup" = data?.admin_pin ? "verify" : "setup";

  return (
    <main className="flex min-h-screen flex-col px-6 pt-10 pb-16">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-[13px] text-[color:var(--ink-3)] active:opacity-60"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
        ホームに戻る
      </Link>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-sm animate-rise">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent)] shadow-[0_10px_30px_-10px_rgba(45,85,69,0.5)]">
              <KeyRound
                className="h-6 w-6 text-white"
                strokeWidth={1.8}
              />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
              Admin Access
            </p>
            <h1 className="mt-2.5 text-[22px] font-semibold leading-[1.4] tracking-tight text-[color:var(--ink)]">
              {mode === "setup" ? "管理者PINを設定" : "管理者PINを入力"}
            </h1>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-3)]">
              {mode === "setup"
                ? "初回のみ4文字以上のPINを設定してください"
                : `${staff.display_name} さん、PINを入力してください`}
            </p>
          </div>

          <PinForm mode={mode} />
        </div>
      </div>
    </main>
  );
}
