import { toISODate } from "./hours";

/**
 * シフトサイクル: カレンダー月（1日〜末日）。月末締め。
 * 締切: 申請対象月の前月末日。
 *
 * 例：
 *   5月1日時点 → 申請対象「6月度（6月1日〜6月30日）」、締切 5月31日
 *   5月31日時点 → 同じく「6月度」、締切は今日
 *   6月1日時点 → 申請対象「7月度（7月1日〜7月31日）」、締切 6月30日
 */
export type TimeOffCycle = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  /** 表示用：申請対象月（startMonth と同じ） */
  cycleMonth: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  deadlineMonth: number;
  deadlineDay: number;
};

/**
 * 「次のサイクル（次のカレンダー月）」を返す。
 */
export function getNextCycle(today: Date = new Date()): TimeOffCycle {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  // 申請対象月 = 翌月
  const startDate = new Date(y, m + 1, 1);
  const endDate = new Date(y, m + 2, 0); // 翌月の末日
  const deadlineDate = new Date(y, m + 1, 0); // 当月の末日

  return {
    start: toISODate(startDate),
    end: toISODate(endDate),
    deadline: toISODate(deadlineDate),
    cycleMonth: startDate.getMonth() + 1,
    startMonth: startDate.getMonth() + 1,
    startDay: 1,
    endMonth: endDate.getMonth() + 1,
    endDay: endDate.getDate(),
    deadlineMonth: deadlineDate.getMonth() + 1,
    deadlineDay: deadlineDate.getDate(),
  };
}

/**
 * 締切までの残り日数（負なら過ぎている）。
 */
export function daysUntilDeadline(today: Date = new Date()): number {
  const cycle = getNextCycle(today);
  const t0 = new Date(today);
  t0.setHours(0, 0, 0, 0);
  const dl = new Date(cycle.deadline + "T00:00:00");
  return Math.round((dl.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
}

export function isRequestPeriod(today: Date = new Date()): boolean {
  return daysUntilDeadline(today) >= 0;
}

/**
 * 互換用：旧 nextMonthRange を残す。
 */
export function nextMonthRange(today: Date = new Date()): {
  start: string;
  end: string;
} {
  const cycle = getNextCycle(today);
  return { start: cycle.start, end: cycle.end };
}
