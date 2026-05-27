"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function upsertShift(formData: FormData) {
  const { staff } = await requireAdmin();
  const supabase = createAdminClient();

  const id = (formData.get("id") as string) || null;
  const staff_id = formData.get("staff_id") as string;
  const warehouse_id = formData.get("warehouse_id") as string;
  const work_date = formData.get("work_date") as string;
  const inputMode = (formData.get("input_mode") as string) ?? "pattern";
  const pattern_id =
    inputMode === "pattern"
      ? ((formData.get("pattern_id") as string) || null)
      : null;
  const start_time =
    inputMode === "free" ? (formData.get("start_time") as string) : null;
  const end_time =
    inputMode === "free" ? (formData.get("end_time") as string) : null;
  const break_minutes = parseInt(
    (formData.get("break_minutes") as string) || "0",
    10,
  );
  const is_published = formData.get("is_published") === "on";
  const note = ((formData.get("note") as string) || "").trim() || null;

  if (!staff_id || !warehouse_id || !work_date) {
    return { ok: false, message: "必須項目が不足しています" };
  }
  if (!pattern_id && (!start_time || !end_time)) {
    return {
      ok: false,
      message: "パターンを選ぶか、開始・終了時刻を入力してください",
    };
  }

  const payload = {
    staff_id,
    warehouse_id,
    work_date,
    pattern_id,
    start_time,
    end_time,
    break_minutes,
    note,
    is_published,
    created_by: staff.id,
  };

  if (id) {
    const { error } = await supabase.from("shifts").update(payload).eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from("shifts").insert(payload);
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          message: "このスタッフのこの日のシフトは既に登録済みです",
        };
      }
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/admin/shifts");
  revalidatePath("/shifts/me");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteShift(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/shifts");
  revalidatePath("/shifts/me");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * 指定月・指定倉庫の下書きシフトを一括で公開する。
 * 予備(△)シフトは対象外。
 */
export async function publishDrafts(payload: {
  warehouseId: string;
  month: string; // YYYY-MM
}): Promise<{ ok: boolean; published?: number; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  if (!/^\d{4}-\d{2}$/.test(payload.month)) {
    return { ok: false, message: "月の指定が不正です" };
  }
  if (!payload.warehouseId) {
    return { ok: false, message: "倉庫を指定してください" };
  }

  const [yearStr, monStr] = payload.month.split("-");
  const start = `${payload.month}-01`;
  const lastDay = new Date(Number(yearStr), Number(monStr), 0).getDate();
  const end = `${payload.month}-${String(lastDay).padStart(2, "0")}`;

  const { error, count } = await supabase
    .from("shifts")
    .update({ is_published: true }, { count: "exact" })
    .eq("warehouse_id", payload.warehouseId)
    .eq("is_published", false)
    .eq("is_tentative", false)
    .gte("work_date", start)
    .lte("work_date", end);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/shifts");
  revalidatePath("/admin/shifts/board");
  revalidatePath("/shifts/all");
  revalidatePath("/shifts/me");
  revalidatePath("/dashboard");
  return { ok: true, published: count ?? 0 };
}

/**
 * 指定月・指定倉庫の公開済みシフトを一括で下書きに戻す。
 * 修正したい時用。
 */
export async function unpublishShifts(payload: {
  warehouseId: string;
  month: string;
}): Promise<{ ok: boolean; reverted?: number; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  if (!/^\d{4}-\d{2}$/.test(payload.month) || !payload.warehouseId) {
    return { ok: false, message: "指定が不正です" };
  }

  const [yearStr, monStr] = payload.month.split("-");
  const start = `${payload.month}-01`;
  const lastDay = new Date(Number(yearStr), Number(monStr), 0).getDate();
  const end = `${payload.month}-${String(lastDay).padStart(2, "0")}`;

  const { error, count } = await supabase
    .from("shifts")
    .update({ is_published: false }, { count: "exact" })
    .eq("warehouse_id", payload.warehouseId)
    .eq("is_published", true)
    .gte("work_date", start)
    .lte("work_date", end);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/shifts");
  revalidatePath("/admin/shifts/board");
  revalidatePath("/shifts/all");
  revalidatePath("/shifts/me");
  revalidatePath("/dashboard");
  return { ok: true, reverted: count ?? 0 };
}

/**
 * シフトを別のスタッフ・別の日付に移動する（ドラッグ&ドロップ用）
 * - 移動先に既存シフト or 予備(△)があれば失敗
 * - 承認済み希望休がある日への移動は警告（フロントで判断）
 * - 倉庫を跨いだ移動も可能（warehouse_id も更新）
 */
export async function moveShift(payload: {
  shiftId: string;
  toStaffId: string;
  toWarehouseId: string;
  toDate: string; // YYYY-MM-DD
}): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  // 移動先に既存シフトがないか確認
  const { data: existing } = await supabase
    .from("shifts")
    .select("id")
    .eq("staff_id", payload.toStaffId)
    .eq("work_date", payload.toDate)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: "移動先には既にシフトがあります",
    };
  }

  const { error } = await supabase
    .from("shifts")
    .update({
      staff_id: payload.toStaffId,
      warehouse_id: payload.toWarehouseId,
      work_date: payload.toDate,
    })
    .eq("id", payload.shiftId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "移動先には既にシフトがあります",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/shifts");
  revalidatePath("/shifts/me");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function togglePublished(id: string, currentValue: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("shifts")
    .update({ is_published: !currentValue })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/shifts");
  return { ok: true };
}
