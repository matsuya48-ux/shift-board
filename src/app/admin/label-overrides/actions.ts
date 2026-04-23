"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function createOverride(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const warehouse_id = formData.get("warehouse_id") as string;
  const override_date = formData.get("override_date") as string;
  const label = ((formData.get("label") as string) ?? "").trim();
  const action = (formData.get("action") as "add" | "skip") ?? "skip";
  const color = (formData.get("color") as string) || "#5a7d9a";
  const note = ((formData.get("note") as string) ?? "").trim() || null;

  if (!warehouse_id || !override_date || !label) {
    return { ok: false, message: "必須項目が不足しています" };
  }

  const { error } = await supabase.from("warehouse_date_label_overrides").insert({
    warehouse_id,
    override_date,
    label,
    action,
    color,
    note,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "同じ内容の例外が既に登録されています" };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/label-overrides");
  revalidatePath("/shifts/all");
  revalidatePath("/admin/print");
  return { ok: true };
}

export async function deleteOverride(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("warehouse_date_label_overrides")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/label-overrides");
  revalidatePath("/shifts/all");
  revalidatePath("/admin/print");
  return { ok: true };
}
