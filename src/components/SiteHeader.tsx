import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let staff: {
    display_name: string;
    role: string;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("staffs")
      .select("display_name, role")
      .eq("id", user.id)
      .single();
    staff = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-6 w-6 items-center justify-center bg-[color:var(--ink)] text-[11px] font-semibold tracking-tight text-white">
            S
          </div>
          <span className="text-sm font-semibold tracking-tight text-[color:var(--ink)]">
            Shift
          </span>
        </Link>

        {staff && (
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/time-off"
              className="text-[13px] font-medium text-[color:var(--ink-secondary)] transition-colors hover:text-[color:var(--ink)]"
            >
              希望休
            </Link>
            <Link
              href="/shifts/me"
              className="text-[13px] font-medium text-[color:var(--ink-secondary)] transition-colors hover:text-[color:var(--ink)]"
            >
              自分のシフト
            </Link>
            <Link
              href="/shifts/all"
              className="text-[13px] font-medium text-[color:var(--ink-secondary)] transition-colors hover:text-[color:var(--ink)]"
            >
              全員のシフト
            </Link>
            {staff.role === "admin" && (
              <Link
                href="/admin"
                className="text-[13px] font-medium text-[color:var(--ink-secondary)] transition-colors hover:text-[color:var(--ink)]"
              >
                管理
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {staff ? (
            <>
              <span className="hidden text-[13px] text-[color:var(--ink-tertiary)] sm:inline">
                {staff.display_name}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-[13px] font-medium text-[color:var(--ink-tertiary)] transition-colors hover:text-[color:var(--ink)]"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-8 items-center bg-[color:var(--ink)] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[color:var(--accent-hover)]"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
