"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/admin";
import { getCurrentStaff } from "@/lib/staff-session";
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

/**
 * 予備(△)シフトを「確定シフト」に変換する。
 * - admin role のみ
 * - is_tentative=false にして start_time / end_time / break_minutes をセット
 */
export async function confirmTentativeShift(
  id: string,
  payload: { start_time: string; end_time: string; break_minutes: number },
): Promise<{ ok: boolean; message?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "未ログインです" };
  if (staff.role !== "admin") {
    return { ok: false, message: "管理者のみ確定できます" };
  }

  if (!payload.start_time || !payload.end_time) {
    return { ok: false, message: "開始・終了時刻を入力してください" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      is_tentative: false,
      start_time: payload.start_time,
      end_time: payload.end_time,
      break_minutes: payload.break_minutes ?? 0,
    })
    .eq("id", id)
    .eq("is_tentative", true);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/shifts/all");
  revalidatePath("/shifts/me");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * 予備(△)シフトを削除する（admin のみ）。
 */
export async function deleteTentativeShift(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "未ログインです" };
  if (staff.role !== "admin") {
    return { ok: false, message: "管理者のみ削除できます" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id)
    .eq("is_tentative", true);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/shifts/all");
  revalidatePath("/shifts/me");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * 予定（Planned）シフトを編集する。
 * - admin role のみ
 * - 時刻を変更するとパターン適用は解除されてフリー入力に切り替わる
 */
export async function updatePlannedShift(
  id: string,
  payload: { start_time: string; end_time: string; break_minutes: number },
): Promise<{ ok: boolean; message?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "未ログインです" };
  if (staff.role !== "admin") {
    return { ok: false, message: "管理者のみ編集できます" };
  }

  if (!payload.start_time || !payload.end_time) {
    return { ok: false, message: "開始・終了時刻を入力してください" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      pattern_id: null, // パターンから外してフリー入力に
      start_time: payload.start_time,
      end_time: payload.end_time,
      break_minutes: payload.break_minutes ?? 0,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/shifts/me");
  revalidatePath("/shifts/all");
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
