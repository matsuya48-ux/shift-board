"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/staff-session";
import { revalidatePath } from "next/cache";

export type TimeOffActionResult = {
  ok: boolean;
  message?: string;
  created?: number;
  skipped?: number;
};

/**
 * 複数日の希望休をまとめて申請する。
 * 既に申請済みの日付はスキップして、新規分だけ登録する。
 */
export async function createTimeOffRequests(
  dates: string[],
): Promise<TimeOffActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "スタッフが選択されていません" };

  if (!Array.isArray(dates) || dates.length === 0) {
    return { ok: false, message: "日付を選択してください" };
  }

  // 今日以降のみ許可
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const target = new Date(d + "T00:00:00");
    if (target < today) {
      return { ok: false, message: "過去の日付は申請できません" };
    }
  }

  const supabase = createAdminClient();

  // 既存の申請を確認して重複を除外
  const { data: existing } = await supabase
    .from("time_off_requests")
    .select("request_date")
    .eq("staff_id", staff.id)
    .in("request_date", dates);

  const existingSet = new Set(
    (existing ?? []).map((r: { request_date: string }) => r.request_date),
  );
  const toInsert = dates.filter((d) => !existingSet.has(d));
  const skipped = dates.length - toInsert.length;

  if (toInsert.length === 0) {
    return {
      ok: false,
      message: "選択した日付はすべて申請済みです",
    };
  }

  const { error } = await supabase.from("time_off_requests").insert(
    toInsert.map((d) => ({
      staff_id: staff.id,
      request_date: d,
    })),
  );

  if (error) {
    return { ok: false, message: `登録に失敗しました: ${error.message}` };
  }

  revalidatePath("/time-off");
  return { ok: true, created: toInsert.length, skipped };
}

export async function cancelTimeOffRequest(
  id: string,
): Promise<TimeOffActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "スタッフが選択されていません" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("time_off_requests")
    .delete()
    .eq("id", id)
    .eq("staff_id", staff.id)
    .eq("status", "pending");

  if (error) {
    return { ok: false, message: `取消に失敗しました: ${error.message}` };
  }

  revalidatePath("/time-off");
  return { ok: true };
}

/**
 * 「今回のサイクルは希望休なし」を登録する。
 * cycleMonth は YYYY-MM 形式（例：'2026-06'）。
 */
export async function markNoTimeOff(
  cycleMonth: string,
): Promise<TimeOffActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "スタッフが選択されていません" };

  if (!/^\d{4}-\d{2}$/.test(cycleMonth)) {
    return { ok: false, message: "サイクル指定が不正です" };
  }

  const supabase = createAdminClient();

  // 同サイクル内に希望休が既に登録されていれば矛盾するので警告
  const start = `${cycleMonth}-01`;
  const [yearStr, monStr] = cycleMonth.split("-");
  const lastDay = new Date(
    Number(yearStr),
    Number(monStr),
    0,
  ).getDate();
  const end = `${cycleMonth}-${String(lastDay).padStart(2, "0")}`;

  const { count } = await supabase
    .from("time_off_requests")
    .select("*", { count: "exact", head: true })
    .eq("staff_id", staff.id)
    .gte("request_date", start)
    .lte("request_date", end);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message:
        "このサイクルには既に希望休が登録されています。先に取り消してから「希望なし」を登録してください。",
    };
  }

  const { error } = await supabase
    .from("time_off_no_requests")
    .upsert(
      { staff_id: staff.id, cycle_month: cycleMonth },
      { onConflict: "staff_id,cycle_month" },
    );

  if (error) {
    return { ok: false, message: `登録に失敗しました: ${error.message}` };
  }

  revalidatePath("/time-off");
  revalidatePath("/dashboard");
  revalidatePath("/admin/time-off");
  return { ok: true };
}

/**
 * 「希望休なし」登録を取り消す。
 */
export async function unmarkNoTimeOff(
  cycleMonth: string,
): Promise<TimeOffActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "スタッフが選択されていません" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("time_off_no_requests")
    .delete()
    .eq("staff_id", staff.id)
    .eq("cycle_month", cycleMonth);

  if (error) {
    return { ok: false, message: `取消に失敗しました: ${error.message}` };
  }

  revalidatePath("/time-off");
  revalidatePath("/dashboard");
  revalidatePath("/admin/time-off");
  return { ok: true };
}
