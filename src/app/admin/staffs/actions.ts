"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseForm(formData: FormData) {
  const display_name = ((formData.get("display_name") as string) ?? "").trim();
  const warehouse_id = (formData.get("warehouse_id") as string) ?? "";
  const role = (formData.get("role") as "staff" | "admin") ?? "staff";
  const employment_type =
    (formData.get("employment_type") as
      | "full"
      | "part"
      | "contract"
      | "short") ?? "part";
  const weekly_hour_limit_raw = formData.get("weekly_hour_limit") as string;
  const weekly_hour_limit =
    weekly_hour_limit_raw && weekly_hour_limit_raw !== ""
      ? parseInt(weekly_hour_limit_raw, 10)
      : null;
  const preferred_start_time =
    (formData.get("preferred_start_time") as string) || null;
  const preferred_end_time =
    (formData.get("preferred_end_time") as string) || null;
  const shift_style =
    (formData.get("shift_style") as "pattern" | "free" | "both") ?? "pattern";
  const is_active = formData.get("is_active") === "on";

  return {
    display_name,
    warehouse_id,
    role,
    employment_type,
    weekly_hour_limit,
    preferred_start_time,
    preferred_end_time,
    shift_style,
    is_active,
  };
}

export async function updateStaff(
  id: string,
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();
  const payload = parseForm(formData);

  if (!payload.display_name || !payload.warehouse_id) {
    return { ok: false, message: "名前と拠点は必須です" };
  }

  const { error } = await supabase
    .from("staffs")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/staffs");
  revalidatePath(`/admin/staffs/${id}`);
  return { ok: true };
}

/**
 * 新規スタッフ登録（名前だけで完結）
 * - auth.users に依存しない（DB上では gen_random_uuid() で id を自動発番）
 */
export async function createStaff(
  formData: FormData,
): Promise<{ ok: boolean; message?: string; id?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();
  const payload = parseForm(formData);

  if (!payload.display_name || !payload.warehouse_id) {
    return { ok: false, message: "名前と拠点は必須です" };
  }

  const { data, error } = await supabase
    .from("staffs")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: `登録に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/staffs");
  revalidatePath("/admin");
  return { ok: true, id: data?.id };
}

export async function deactivateStaff(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("staffs")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/staffs");
  redirect("/admin/staffs");
}
