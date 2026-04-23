"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

function parsePattern(formData: FormData) {
  return {
    warehouse_id: formData.get("warehouse_id") as string,
    code: ((formData.get("code") as string) ?? "").trim(),
    label: ((formData.get("label") as string) ?? "").trim(),
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    break_minutes: parseInt(
      (formData.get("break_minutes") as string) || "0",
      10,
    ),
    color: (formData.get("color") as string) || "#6366f1",
  };
}

export async function createPattern(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();
  const payload = parsePattern(formData);

  if (!payload.warehouse_id || !payload.code || !payload.label) {
    return { ok: false, message: "拠点・コード・表示名は必須です" };
  }

  const { error } = await supabase.from("shift_patterns").insert(payload);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "同じ拠点に同じコードのパターンが既にあります",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/patterns");
  return { ok: true };
}

export async function updatePattern(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();
  const payload = parsePattern(formData);

  const { error } = await supabase
    .from("shift_patterns")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/patterns");
  return { ok: true };
}

export async function deletePattern(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("shift_patterns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/patterns");
  return { ok: true };
}
