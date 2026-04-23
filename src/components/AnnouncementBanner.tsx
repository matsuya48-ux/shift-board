import { createAdminClient } from "@/lib/supabase/admin";
import { Megaphone, Pin } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  warehouse_id: string | null;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
};

export async function AnnouncementBanner({
  warehouseId,
}: {
  warehouseId: string;
}) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("announcements")
    .select("*")
    .or(`warehouse_id.is.null,warehouse_id.eq.${warehouseId}`)
    .lte("published_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(3);

  const items = (data ?? []) as Announcement[];

  if (items.length === 0) return null;

  return (
    <section className="mb-4 space-y-2 animate-rise">
      {items.map((a) => (
        <article
          key={a.id}
          className="flex items-start gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 shadow-[var(--shadow-sm)]"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
            {a.is_pinned ? (
              <Pin className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Megaphone className="h-4 w-4" strokeWidth={1.8} />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[13px] font-semibold leading-snug tracking-tight text-[color:var(--ink)]">
              {a.title}
            </p>
            {a.body && (
              <p className="text-[12px] leading-relaxed text-[color:var(--ink-2)] whitespace-pre-wrap">
                {a.body}
              </p>
            )}
            <p className="text-[10px] text-[color:var(--ink-3)] tabular-nums">
              {new Date(a.published_at).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
