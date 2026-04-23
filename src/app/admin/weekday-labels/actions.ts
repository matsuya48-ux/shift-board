"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function createWeekdayLabel(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const warehouse_id = formData.get("warehouse_id") as string;
  const weekday = parseInt((formData.get("weekday") as string) || "1", 10);
  const label = ((formData.get("label") as string) ?? "").trim();
  const color = (formData.get("color") as string) || "#5a7d9a";

  if (!warehouse_id || !label) {
    return { ok: false, message: "必須項目が不足しています" };
  }

  const { error } = await supabase.from("warehouse_weekday_labels").insert({
    warehouse_id,
    weekday,
    label,
    color,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "同じ拠点・曜日・ラベルの組み合わせが既に存在します",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/weekday-labels");
  revalidatePath("/shifts/all");
  return { ok: true };
}

export async function deleteWeekdayLabel(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("warehouse_weekday_labels")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/weekday-labels");
  revalidatePath("/shifts/all");
  return { ok: true };
}
