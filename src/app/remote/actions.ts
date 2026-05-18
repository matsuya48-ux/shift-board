"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/staff-session";
import { revalidatePath } from "next/cache";

export type RemoteReportResult = { ok: boolean; message?: string };

type Payload = {
  work_date: string;
  task_name: string;
  start_time: string;
  end_time: string;
  item_count: number;
  note?: string | null;
};

function validate(p: Payload): string | null {
  if (!p.work_date) return "日付を入力してください";
  if (!p.task_name.trim()) return "業務内容を入力してください";
  if (!p.start_time || !p.end_time)
    return "開始・終了時刻を入力してください";
  if (p.start_time >= p.end_time)
    return "終了時刻は開始時刻より後にしてください";
  if (
    !Number.isFinite(p.item_count) ||
    p.item_count < 0 ||
    p.item_count > 100000
  )
    return "件数が不正です";
  return null;
}

export async function createRemoteReport(
  payload: Payload,
): Promise<RemoteReportResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "未ログインです" };
  const err = validate(payload);
  if (err) return { ok: false, message: err };

  const supabase = createAdminClient();
  const { error } = await supabase.from("remote_work_reports").insert({
    staff_id: staff.id,
    work_date: payload.work_date,
    task_name: payload.task_name.trim(),
    start_time: payload.start_time,
    end_time: payload.end_time,
    item_count: payload.item_count,
    note: payload.note?.trim() || null,
  });

  if (error)
    return { ok: false, message: `登録に失敗しました: ${error.message}` };

  revalidatePath("/remote");
  revalidatePath("/admin/remote");
  return { ok: true };
}

export async function updateRemoteReport(
  id: string,
  payload: Payload,
): Promise<RemoteReportResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "未ログインです" };
  const err = validate(payload);
  if (err) return { ok: false, message: err };

  const supabase = createAdminClient();

  // 本人の報告のみ更新可（admin は全件OK）
  const { data: row } = await supabase
    .from("remote_work_reports")
    .select("staff_id")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "報告が見つかりません" };
  if (row.staff_id !== staff.id && staff.role !== "admin") {
    return { ok: false, message: "この報告は編集できません" };
  }

  const { error } = await supabase
    .from("remote_work_reports")
    .update({
      work_date: payload.work_date,
      task_name: payload.task_name.trim(),
      start_time: payload.start_time,
      end_time: payload.end_time,
      item_count: payload.item_count,
      note: payload.note?.trim() || null,
    })
    .eq("id", id);

  if (error)
    return { ok: false, message: `更新に失敗しました: ${error.message}` };

  revalidatePath("/remote");
  revalidatePath("/admin/remote");
  return { ok: true };
}

export async function deleteRemoteReport(
  id: string,
): Promise<RemoteReportResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, message: "未ログインです" };

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("remote_work_reports")
    .select("staff_id")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "報告が見つかりません" };
  if (row.staff_id !== staff.id && staff.role !== "admin") {
    return { ok: false, message: "この報告は削除できません" };
  }

  const { error } = await supabase
    .from("remote_work_reports")
    .delete()
    .eq("id", id);
  if (error)
    return { ok: false, message: `削除に失敗しました: ${error.message}` };

  revalidatePath("/remote");
  revalidatePath("/admin/remote");
  return { ok: true };
}
