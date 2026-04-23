"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export type FeedbackStatus = "new" | "read" | "done" | "archived";

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feature_requests")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  revalidatePath("/feedback");
  return { ok: true };
}

export async function updateFeedbackNote(
  id: string,
  admin_note: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  const trimmed = admin_note.trim();
  const { error } = await supabase
    .from("feature_requests")
    .update({ admin_note: trimmed === "" ? null : trimmed })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/feedback");
  revalidatePath("/feedback");
  return { ok: true };
}

export async function deleteFeedback(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("feature_requests")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  return { ok: true };
}
