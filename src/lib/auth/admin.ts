import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentStaff, type SessionStaff } from "@/lib/staff-session";

const ADMIN_COOKIE_KEY = "admin_pin_ok";

/**
 * 管理者のみアクセス可能なページで呼び出す。
 * - 未選択: /select-staff へ
 * - 管理者でない: /dashboard へ
 * - PIN 未認証: /admin/gate へ
 */
export async function requireAdmin(): Promise<{ staff: SessionStaff }> {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect("/select-staff");
  }

  if (staff.role !== "admin") {
    redirect("/dashboard");
  }

  // PINゲートチェック（/admin/gate 自身は除外）
  const cookieStore = await cookies();
  if (!cookieStore.get(ADMIN_COOKIE_KEY)?.value) {
    redirect("/admin/gate");
  }

  return { staff };
}

/**
 * 一般スタッフ用。未選択なら /select-staff へ。
 */
export async function requireStaff(): Promise<{ staff: SessionStaff }> {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect("/select-staff");
  }

  return { staff };
}

/**
 * 現在のスタッフが「認証済み管理者」であるかを返す（リダイレクトしない）。
 */
export async function isAuthenticatedAdmin(): Promise<boolean> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") return false;
  const cookieStore = await cookies();
  return !!cookieStore.get(ADMIN_COOKIE_KEY)?.value;
}
