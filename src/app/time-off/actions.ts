"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/staff-session";
import { revalidatePath } from "next/cache";

export type TimeOffActionResult = {
  ok: boolean;
  message?: string;
};

export async function createTimeOffRequest(
  formData: FormData,
): Promise<TimeOffActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "スタッフが選択されていません" };

  const requestDate = formData.get("request_date") as string;
  if (!requestDate) {
    return { ok: false, message: "日付を選択してください" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(requestDate);
  if (target < today) {
    return { ok: false, message: "過去の日付は申請できません" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("time_off_requests").insert({
    staff_id: staff.id,
    request_date: requestDate,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "この日付は既に申請済みです" };
    }
    return { ok: false, message: `登録に失敗しました: ${error.message}` };
  }

  revalidatePath("/time-off");
  return { ok: true };
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
