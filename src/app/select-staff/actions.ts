"use server";

import { redirect } from "next/navigation";
import { setStaffCookie, clearStaffCookie } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function selectStaff(staffId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("staffs")
    .select("id")
    .eq("id", staffId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    return { ok: false, message: "スタッフが見つかりませんでした" };
  }

  await setStaffCookie(data.id);
  redirect("/dashboard");
}

export async function logoutStaff() {
  await clearStaffCookie();
  redirect("/select-staff");
}
