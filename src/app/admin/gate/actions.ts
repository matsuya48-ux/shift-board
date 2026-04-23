"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_COOKIE_KEY = "admin_pin_ok";
const ADMIN_COOKIE_TTL = 60 * 60 * 6; // 6時間

export async function verifyAdminPin(formData: FormData) {
  const pin = ((formData.get("pin") as string) ?? "").trim();
  if (!pin) return { ok: false, message: "PINを入力してください" };

  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") {
    return { ok: false, message: "管理者のみアクセスできます" };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("staffs")
    .select("admin_pin")
    .eq("id", staff.id)
    .single();

  if (data?.admin_pin !== pin) {
    return { ok: false, message: "PINが一致しません" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_KEY, "1", {
    maxAge: ADMIN_COOKIE_TTL,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

export async function setupAdminPin(formData: FormData) {
  const pin = ((formData.get("pin") as string) ?? "").trim();
  const confirm = ((formData.get("confirm") as string) ?? "").trim();

  if (!pin || pin.length < 4) {
    return { ok: false, message: "PINは4文字以上で入力してください" };
  }
  if (pin !== confirm) {
    return { ok: false, message: "確認用PINが一致しません" };
  }

  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") {
    return { ok: false, message: "管理者のみアクセスできます" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("staffs")
    .update({ admin_pin: pin })
    .eq("id", staff.id);

  if (error) return { ok: false, message: error.message };

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_KEY, "1", {
    maxAge: ADMIN_COOKIE_TTL,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

export async function lockAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_KEY);
  redirect("/dashboard");
}
