"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

/** 実働時間を記録（予定と異なる場合） */
export async function updateActualShift(
  id: string,
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();

  const start = formData.get("actual_start_time") as string;
  const end = formData.get("actual_end_time") as string;
  const breakMin = parseInt(
    (formData.get("actual_break_minutes") as string) || "0",
    10,
  );

  if (!start || !end) {
    return { ok: false, message: "開始・終了時刻を入力してください" };
  }

  // 本人の shift のみ更新可能
  const { data: shift } = await supabase
    .from("shifts")
    .select("staff_id")
    .eq("id", id)
    .single();

  if (!shift || shift.staff_id !== staff.id) {
    return { ok: false, message: "このシフトは編集できません" };
  }

  const { error } = await supabase
    .from("shifts")
    .update({
      actual_start_time: start,
      actual_end_time: end,
      actual_break_minutes: breakMin,
      actual_updated_at: new Date().toISOString(),
      actual_updated_by: staff.id,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/shifts/me");
  return { ok: true };
}

/** 実働記録をクリア（= 予定通りに戻す） */
export async function clearActualShift(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const { staff } = await requireStaff();
  const supabase = createAdminClient();

  const { data: shift } = await supabase
    .from("shifts")
    .select("staff_id")
    .eq("id", id)
    .single();

  if (!shift || shift.staff_id !== staff.id) {
    return { ok: false, message: "このシフトは編集できません" };
  }

  const { error } = await supabase
    .from("shifts")
    .update({
      actual_start_time: null,
      actual_end_time: null,
      actual_break_minutes: null,
      actual_updated_at: new Date().toISOString(),
      actual_updated_by: staff.id,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/shifts/me");
  return { ok: true };
}
