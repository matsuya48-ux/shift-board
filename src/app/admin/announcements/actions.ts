"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const { staff } = await requireAdmin();
  const supabase = createAdminClient();

  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim() || null;
  const warehouse_id =
    (formData.get("warehouse_id") as string) || null;
  const is_pinned = formData.get("is_pinned") === "on";
  const expiresRaw = (formData.get("expires_at") as string) || "";
  const expires_at = expiresRaw ? new Date(expiresRaw).toISOString() : null;

  if (!title) return { ok: false, message: "タイトルは必須です" };

  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    warehouse_id: warehouse_id || null,
    is_pinned,
    expires_at,
    created_by: staff.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}
