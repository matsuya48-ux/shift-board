"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import {
  toISODate,
  monthRange,
  type PatternRow,
} from "@/lib/hours";

type SuggestionResult = {
  ok: boolean;
  message?: string;
  stats?: {
    created: number;
    skipped: number;
    perStaff: { name: string; created: number; skipped: number; reason?: string }[];
  };
};

type StaffRec = {
  id: string;
  display_name: string;
  warehouse_id: string;
  weekly_hour_limit: number | null;
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  shift_style: "pattern" | "free" | "both";
};

function diffMinutes(startHHMM: string, endHHMM: string): number {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  let m = eh * 60 + em - (sh * 60 + sm);
  if (m < 0) m += 24 * 60;
  return m;
}

/** 月曜始まりのISO週キーを返す */
function weekKey(d: Date): string {
  const t = new Date(d);
  const dow = t.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  t.setDate(t.getDate() + diff);
  return toISODate(t);
}

/**
 * 指定拠点・指定月のシフトを自動提案。
 * - 月〜金の平日のみ作成（簡易版）
 * - 既にシフトがある日、承認済み希望休の日はスキップ
 * - スタッフの preferred_start_time / preferred_end_time を使用
 * - shift_style=pattern の場合は最も近いパターンを自動選択
 * - weekly_hour_limit を超えないように調整
 * - 作成したシフトは下書き（is_published=false）
 */
export async function autoSuggest(formData: FormData): Promise<SuggestionResult> {
  const { staff: admin } = await requireAdmin();
  const supabase = createAdminClient();

  const warehouseId = formData.get("warehouse_id") as string;
  const month = formData.get("month") as string; // YYYY-MM

  if (!warehouseId || !month) {
    return { ok: false, message: "拠点と月を指定してください" };
  }

  const [y, m] = month.split("-").map(Number);
  const target = new Date(y, m - 1, 1);
  const { start, end } = monthRange(target);

  // 対象スタッフ
  const { data: staffsRaw } = await supabase
    .from("staffs")
    .select(
      "id, display_name, warehouse_id, weekly_hour_limit, preferred_start_time, preferred_end_time, shift_style",
    )
    .eq("warehouse_id", warehouseId)
    .eq("is_active", true);
  const staffs = (staffsRaw ?? []) as StaffRec[];

  // パターン
  const { data: patternsRaw } = await supabase
    .from("shift_patterns")
    .select("*")
    .eq("warehouse_id", warehouseId);
  const patterns = (patternsRaw ?? []) as PatternRow[];

  // 既存シフト
  const { data: existingShifts } = await supabase
    .from("shifts")
    .select("staff_id, work_date")
    .eq("warehouse_id", warehouseId)
    .gte("work_date", toISODate(start))
    .lte("work_date", toISODate(end));
  const existing = new Set(
    (existingShifts ?? []).map((s) => `${s.staff_id}_${s.work_date}`),
  );

  // 承認済み希望休
  const { data: timeOffs } = await supabase
    .from("time_off_requests")
    .select("staff_id, request_date, status")
    .in(
      "staff_id",
      staffs.map((s) => s.id),
    )
    .gte("request_date", toISODate(start))
    .lte("request_date", toISODate(end))
    .in("status", ["approved", "pending"]);
  const blocked = new Set(
    (timeOffs ?? []).map((t) => `${t.staff_id}_${t.request_date}`),
  );

  // 日付リスト
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const toInsert: {
    staff_id: string;
    warehouse_id: string;
    work_date: string;
    pattern_id: string | null;
    start_time: string | null;
    end_time: string | null;
    break_minutes: number;
    is_published: boolean;
    created_by: string;
  }[] = [];

  const perStaff: { name: string; created: number; skipped: number; reason?: string }[] = [];

  for (const st of staffs) {
    if (!st.preferred_start_time || !st.preferred_end_time) {
      perStaff.push({
        name: st.display_name,
        created: 0,
        skipped: 0,
        reason: "希望時間帯が未設定",
      });
      continue;
    }

    // 使うパターンを決定
    let pattern: PatternRow | null = null;
    if (st.shift_style !== "free") {
      pattern =
        patterns.find(
          (p) =>
            p.start_time.slice(0, 5) ===
              st.preferred_start_time?.slice(0, 5) &&
            p.end_time.slice(0, 5) === st.preferred_end_time?.slice(0, 5),
        ) ?? null;
    }

    const breakMin = pattern?.break_minutes ?? 0;
    const mins = diffMinutes(
      pattern?.start_time.slice(0, 5) ?? st.preferred_start_time.slice(0, 5),
      pattern?.end_time.slice(0, 5) ?? st.preferred_end_time.slice(0, 5),
    ) - breakMin;
    const shiftHoursVal = mins / 60;

    const weekMinutes = new Map<string, number>();
    let created = 0;
    let skipped = 0;

    for (const day of days) {
      const dow = day.getDay();
      if (dow === 0 || dow === 6) continue; // 土日スキップ
      const dateStr = toISODate(day);
      const key = `${st.id}_${dateStr}`;
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      if (blocked.has(key)) {
        skipped++;
        continue;
      }

      // 週上限チェック
      if (st.weekly_hour_limit) {
        const wk = weekKey(day);
        const used = weekMinutes.get(wk) ?? 0;
        if ((used + mins) / 60 > st.weekly_hour_limit) {
          skipped++;
          continue;
        }
        weekMinutes.set(wk, used + mins);
      }

      toInsert.push({
        staff_id: st.id,
        warehouse_id: st.warehouse_id,
        work_date: dateStr,
        pattern_id: pattern?.id ?? null,
        start_time: pattern ? null : st.preferred_start_time,
        end_time: pattern ? null : st.preferred_end_time,
        break_minutes: breakMin,
        is_published: false,
        created_by: admin.id,
      });
      created++;
    }

    perStaff.push({ name: st.display_name, created, skipped });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("shifts").insert(toInsert);
    if (error) {
      return { ok: false, message: `登録に失敗しました: ${error.message}` };
    }
  }

  revalidatePath("/admin/shifts");
  revalidatePath("/shifts/all");
  revalidatePath("/dashboard");

  const totalCreated = perStaff.reduce((sum, p) => sum + p.created, 0);
  const totalSkipped = perStaff.reduce((sum, p) => sum + p.skipped, 0);

  return {
    ok: true,
    stats: {
      created: totalCreated,
      skipped: totalSkipped,
      perStaff,
    },
  };
}
