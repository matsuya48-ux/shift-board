import Link from "next/link";
import { CalendarHeart, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isRequestPeriod,
  nextMonthRange,
} from "@/lib/time-off-reminder";

export async function TimeOffReminder({ staffId }: { staffId: string }) {
  const today = new Date();
  if (!isRequestPeriod(today)) return null;

  const { start, end } = nextMonthRange(today);

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("time_off_requests")
    .select("*", { count: "exact", head: true })
    .eq("staff_id", staffId)
    .gte("request_date", start)
    .lte("request_date", end);

  // 既に1件以上提出済みなら表示しない
  if ((count ?? 0) > 0) return null;

  const [y, m] = start.split("-").map(Number);
  const deadline = `${today.getMonth() + 1}月10日`;

  return (
    <Link
      href="/time-off"
      className="mb-4 flex items-center gap-3.5 rounded-2xl border border-[color:var(--warning)]/30 bg-[#fdf5e6] p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98] animate-rise"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--warning)] text-white">
        <CalendarHeart className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-[14px] font-semibold tracking-tight text-[color:var(--ink)]">
          {y}年{m}月分の希望休を申請してください
        </p>
        <p className="text-[11px] text-[color:var(--ink-2)]">
          締切：{deadline}まで・まだ未提出です
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 flex-shrink-0 text-[color:var(--warning)]"
        strokeWidth={2.2}
      />
    </Link>
  );
}
