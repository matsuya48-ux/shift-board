"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function approveTimeOff(formData: FormData) {
  const { staff } = await requireAdmin();
  const supabase = createAdminClient();

  const id = formData.get("id") as string;
  const note = (formData.get("note") as string) || null;

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "approved",
      admin_note: note,
      decided_at: new Date().toISOString(),
      decided_by: staff.id,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/time-off");
  revalidatePath("/admin");
  return { ok: true };
}

export async function rejectTimeOff(formData: FormData) {
  const { staff } = await requireAdmin();
  const supabase = createAdminClient();

  const id = formData.get("id") as string;
  const note = (formData.get("note") as string) || null;

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "rejected",
      admin_note: note,
      decided_at: new Date().toISOString(),
      decided_by: staff.id,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/time-off");
  revalidatePath("/admin");
  return { ok: true };
}

export async function approveAllPending() {
  const { staff } = await requireAdmin();
  const supabase = createAdminClient();

  const { data: pendings, error: fetchError } = await supabase
    .from("time_off_requests")
    .select("id")
    .eq("status", "pending");

  if (fetchError) return { ok: false, message: fetchError.message };

  if (!pendings || pendings.length === 0) {
    return { ok: true, count: 0 };
  }

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: staff.id,
    })
    .eq("status", "pending");

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/time-off");
  revalidatePath("/admin");
  return { ok: true, count: pendings.length };
}

export async function revertTimeOff(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: "pending",
      admin_note: null,
      decided_at: null,
      decided_by: null,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/time-off");
  revalidatePath("/admin");
  return { ok: true };
}
