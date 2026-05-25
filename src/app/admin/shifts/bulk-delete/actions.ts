"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export type BulkDeleteResult = {
  ok: boolean;
  deleted?: number;
  message?: string;
};

/**
 * 指定月のシフトを一括削除する。
 * - admin のみ
 * - month は 'YYYY-MM' 形式
 * - 倉庫を指定した場合はその倉庫のみ
 */
export async function bulkDeleteShifts(payload: {
  month: string; // YYYY-MM
  warehouseId?: string | null;
  confirmText: string;
}): Promise<BulkDeleteResult> {
  await requireAdmin();

  if (!/^\d{4}-\d{2}$/.test(payload.month)) {
    return { ok: false, message: "月の指定が不正です（YYYY-MM）" };
  }

  // 確認テキスト（典型的なミス削除防止）
  const expectedConfirm = `削除 ${payload.month}`;
  if (payload.confirmText.trim() !== expectedConfirm) {
    return {
      ok: false,
      message: `確認用テキスト「${expectedConfirm}」を入力してください`,
    };
  }

  const [yearStr, monStr] = payload.month.split("-");
  const start = `${payload.month}-01`;
  const lastDay = new Date(Number(yearStr), Number(monStr), 0).getDate();
  const end = `${payload.month}-${String(lastDay).padStart(2, "0")}`;

  const supabase = createAdminClient();
  let q = supabase
    .from("shifts")
    .delete({ count: "exact" })
    .gte("work_date", start)
    .lte("work_date", end);

  if (payload.warehouseId) {
    q = q.eq("warehouse_id", payload.warehouseId);
  }

  const { error, count } = await q;
  if (error) return { ok: false, message: error.message };

  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");
  revalidatePath("/shifts/me");
  revalidatePath("/admin");
  revalidatePath("/admin/shifts");
  return { ok: true, deleted: count ?? 0 };
}
