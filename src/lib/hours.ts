/**
 * シフト時間計算ユーティリティ
 */

export type ShiftRow = {
  id: string;
  staff_id: string;
  warehouse_id?: string;
  work_date: string; // YYYY-MM-DD
  pattern_id: string | null;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  actual_break_minutes?: number | null;
  note?: string | null;
  is_published?: boolean;
  /** 予備（△）出勤フラグ。集計から除外して △ 表示。 */
  is_tentative?: boolean;
};

export type PatternRow = {
  id: string;
  code: string;
  label: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  color?: string | null;
};

export type ShiftEffective = {
  start: string; // HH:MM:SS
  end: string;
  break_minutes: number;
  /** 実働が記録済みか（予定と異なる、または明示的に記録済み） */
  hasActual: boolean;
};

/**
 * シフトの「有効な時刻」を決定する。
 * 過去かつ actual_* があればそちら、なければ予定の時刻を使う。
 */
export function effectiveTimes(
  shift: ShiftRow,
  patterns: Map<string, PatternRow>,
): ShiftEffective | null {
  // 実働が明示的にセットされていればそちらを優先
  if (shift.actual_start_time && shift.actual_end_time) {
    return {
      start: shift.actual_start_time,
      end: shift.actual_end_time,
      break_minutes: shift.actual_break_minutes ?? shift.break_minutes ?? 0,
      hasActual: true,
    };
  }

  // 予定（パターン or 直接入力）
  if (shift.pattern_id) {
    const p = patterns.get(shift.pattern_id);
    if (p) {
      return {
        start: p.start_time,
        end: p.end_time,
        break_minutes: p.break_minutes ?? 0,
        hasActual: false,
      };
    }
  }

  if (shift.start_time && shift.end_time) {
    return {
      start: shift.start_time,
      end: shift.end_time,
      break_minutes: shift.break_minutes ?? 0,
      hasActual: false,
    };
  }

  return null;
}

/** シフト1件の実働時間（小数時間）。予備(△)シフトは0時間扱い。 */
export function shiftHours(
  shift: ShiftRow,
  patterns: Map<string, PatternRow>,
): number {
  if (shift.is_tentative) return 0;
  const eff = effectiveTimes(shift, patterns);
  if (!eff) return 0;
  const mins = diffMinutes(eff.start, eff.end) - eff.break_minutes;
  return Math.max(0, mins / 60);
}

function diffMinutes(startHHMM: string, endHHMM: string): number {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

/** "HH:MM" 形式に（秒などを除去） */
export function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/** "9:30" 形式（先頭ゼロ除去。短縮表示用） */
export function fmtTimeShort(t: string | null | undefined): string {
  if (!t) return "";
  const s = t.slice(0, 5);
  return s.startsWith("0") ? s.slice(1) : s;
}

/** 日付（YYYY-MM-DD）を取得 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 月曜始まりで週範囲を返す */
export function weekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

/** 月の範囲 */
export function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

export type HoursSummary = {
  /** 過去のシフトの合計（実働として扱う） */
  actual: number;
  /** 今日以降のシフトの合計（予定） */
  planned: number;
  /** 合計 */
  total: number;
  count: number;
};

export function summarize(
  shifts: ShiftRow[],
  patterns: Map<string, PatternRow>,
  today: Date = new Date(),
): HoursSummary {
  const todayStr = toISODate(today);
  let actual = 0;
  let planned = 0;

  for (const s of shifts) {
    const h = shiftHours(s, patterns);
    if (s.work_date < todayStr) {
      actual += h;
    } else {
      planned += h;
    }
  }

  return { actual, planned, total: actual + planned, count: shifts.length };
}

export function fmtHours(h: number): string {
  if (h === 0) return "0";
  return h.toFixed(1).replace(/\.0$/, "");
}
