import { cookies } from "next/headers";
import { createAdminClient } from "./supabase/admin";

const STAFF_COOKIE_KEY = "selected_staff_id";
const STAFF_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 3ヶ月（90日）

export type SessionStaff = {
  id: string;
  display_name: string;
  role: "staff" | "admin";
  warehouse_id: string;
  warehouse_name: string | null;
};

/**
 * クッキーから現在のスタッフ情報を取得。
 * 未選択なら null を返す。
 */
export async function getCurrentStaff(): Promise<SessionStaff | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(STAFF_COOKIE_KEY)?.value;
  if (!id) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("staffs")
    .select("id, display_name, role, warehouse_id, warehouses(name)")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  const warehouse_name = (data.warehouses as unknown as { name: string } | null)
    ?.name;

  return {
    id: data.id,
    display_name: data.display_name,
    role: data.role as "staff" | "admin",
    warehouse_id: data.warehouse_id,
    warehouse_name: warehouse_name ?? null,
  };
}

/**
 * Cookieにスタッフidをセット。
 */
export async function setStaffCookie(staffId: string) {
  const cookieStore = await cookies();
  cookieStore.set(STAFF_COOKIE_KEY, staffId, {
    maxAge: STAFF_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Cookieを削除。
 */
export async function clearStaffCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE_KEY);
}
