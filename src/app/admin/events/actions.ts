"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function createEvent(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const warehouse_id = formData.get("warehouse_id") as string;
  const event_date = formData.get("event_date") as string;
  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim() || null;
  const color = (formData.get("color") as string) || "#c98579";

  if (!warehouse_id || !event_date || !title) {
    return { ok: false, message: "必須項目が不足しています" };
  }

  const { error } = await supabase.from("warehouse_events").insert({
    warehouse_id,
    event_date,
    title,
    description,
    color,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "同じ日に同じイベントが既に登録されています" };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/events");
  revalidatePath("/shifts/all");
  return { ok: true };
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.from("warehouse_events").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/events");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEvent(
  id: string,
  payload: {
    event_date: string;
    title: string;
    description?: string | null;
    color?: string | null;
  },
) {
  await requireAdmin();
  const supabase = createAdminClient();

  const title = (payload.title ?? "").trim();
  const description =
    typeof payload.description === "string"
      ? payload.description.trim() || null
      : null;
  if (!payload.event_date || !title) {
    return { ok: false, message: "日付とタイトルは必須です" };
  }

  const { error } = await supabase
    .from("warehouse_events")
    .update({
      event_date: payload.event_date,
      title,
      description,
      color: payload.color ?? "#c98579",
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "同じ日に同じイベントが既に登録されています" };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/events");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  return { ok: true };
}
