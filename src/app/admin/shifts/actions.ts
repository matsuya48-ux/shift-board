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
