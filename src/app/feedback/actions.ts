"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/staff-session";
import { revalidatePath } from "next/cache";

export type FeedbackCategory = "feature" | "bug" | "other";

export type FeedbackActionResult = {
  ok: boolean;
  message?: string;
};

/**
 * スタッフからの機能追加リクエスト・不具合報告・問い合わせを登録する。
 */
export async function createFeedback(
  formData: FormData,
): Promise<FeedbackActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "スタッフが選択されていません" };

  const category = ((formData.get("category") as string) ?? "feature") as FeedbackCategory;
  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim();

  if (!["feature", "bug", "other"].includes(category)) {
    return { ok: false, message: "カテゴリが不正です" };
  }
  if (!title) return { ok: false, message: "タイトルを入力してください" };
  if (title.length > 80) {
    return { ok: false, message: "タイトルは80文字以内で入力してください" };
  }
  if (!body) return { ok: false, message: "内容を入力してください" };
  if (body.length > 2000) {
    return { ok: false, message: "内容は2000文字以内で入力してください" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("feature_requests").insert({
    staff_id: staff.id,
    category,
    title,
    body,
  });

  if (error) {
    return { ok: false, message: `送信に失敗しました: ${error.message}` };
  }

  revalidatePath("/feedback");
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  return { ok: true };
}
