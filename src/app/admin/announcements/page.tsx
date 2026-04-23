import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, Pin } from "lucide-react";
import { AnnouncementForm } from "./_components/AnnouncementForm";
import { AnnouncementDeleteButton } from "./_components/AnnouncementDeleteButton";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  warehouse_id: string | null;
  warehouses: { name: string } | null;
  published_at: string;
  expires_at: string | null;
  is_pinned: boolean;
};

export default async function AnnouncementsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: warehouses }, { data: list }] = await Promise.all([
    supabase.from("warehouses").select("id, name").order("name"),
    supabase
      .from("announcements")
      .select("*, warehouses(name)")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }),
  ]);

  const items = (list as unknown as Announcement[]) ?? [];

  return (
    <AppShell>
      <div
        className="mx-auto w-full px-4 pb-8 pt-6 sm:px-6 md:px-8 landscape:px-6 sm:max-w-2xl animate-rise"
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
            Announcements
          </p>
          <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.35] tracking-tight text-[color:var(--ink)]">
            お知らせ
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-3)]">
            スタッフのダッシュボードに表示されるメッセージを管理します
          </p>
        </header>

        <section className="mb-6 rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-[14px] font-semibold text-[color:var(--ink)]">
            新規作成
          </h2>
          <AnnouncementForm warehouses={warehouses ?? []} />
        </section>

        <h2 className="mb-3 px-1 text-[13px] font-semibold text-[color:var(--ink-2)]">
          既存のお知らせ（{items.length}件）
        </h2>
        {items.length === 0 ? (
          <div className="rounded-2xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[13px] text-[color:var(--ink-3)]">
              まだお知らせはありません
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => {
              const expired =
                a.expires_at && new Date(a.expires_at) < new Date();
              return (
                <div
                  key={a.id}
                  className={`rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)] ${expired ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && (
                          <Pin
                            className="h-3 w-3 flex-shrink-0 text-[color:var(--accent)]"
                            strokeWidth={2.2}
                          />
                        )}
                        <p className="text-[14px] font-semibold text-[color:var(--ink)]">
                          {a.title}
                        </p>
                        {expired && (
                          <span className="rounded bg-[color:var(--bg)] px-1.5 py-0.5 text-[10px] text-[color:var(--ink-3)]">
                            期限切れ
                          </span>
                        )}
                      </div>
                      {a.body && (
                        <p className="text-[12px] leading-relaxed text-[color:var(--ink-2)] whitespace-pre-wrap">
                          {a.body}
                        </p>
                      )}
                      <p className="flex flex-wrap gap-x-3 text-[10px] text-[color:var(--ink-3)] tabular-nums">
                        <span>
                          対象:{" "}
                          {a.warehouses?.name ?? "全拠点"}
                        </span>
                        <span>
                          公開:{" "}
                          {new Date(a.published_at).toLocaleDateString(
                            "ja-JP",
                          )}
                        </span>
                        {a.expires_at && (
                          <span>
                            期限:{" "}
                            {new Date(a.expires_at).toLocaleDateString(
                              "ja-JP",
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                    <AnnouncementDeleteButton id={a.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
