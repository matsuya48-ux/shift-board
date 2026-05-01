import { toISODate } from "./hours";

/**
 * シフトサイクル: 毎月16日～翌月15日
 * 締切: サイクル開始日の前日（15日）
 *
 * 例：
 *   5月1日時点 → 申請対象「5月16日〜6月15日」、締切 5月15日
 *   5月16日時点 → 申請対象「6月16日〜7月15日」、締切 6月15日
 */
export type TimeOffCycle = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  deadlineMonth: number;
  deadlineDay: number;
};

/**
 * 「次のサイクル」（まだ始まっていないサイクル）を返す。
 */
export function getNextCycle(today: Date = new Date()): TimeOffCycle {
  const day = today.getDate();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  let startDate: Date;
  let endDate: Date;
  let deadlineDate: Date;

  if (day <= 15) {
    // 今月16日〜翌月15日。締切は今月15日
    startDate = new Date(y, m, 16);
    endDate = new Date(y, m + 1, 15);
    deadlineDate = new Date(y, m, 15);
  } else {
    // 翌月16日〜翌々月15日。締切は翌月15日
    startDate = new Date(y, m + 1, 16);
    endDate = new Date(y, m + 2, 15);
    deadlineDate = new Date(y, m + 1, 15);
  }

  return {
    start: toISODate(startDate),
    end: toISODate(endDate),
    deadline: toISODate(deadlineDate),
    startMonth: startDate.getMonth() + 1,
    startDay: 16,
    endMonth: endDate.getMonth() + 1,
    endDay: 15,
    deadlineMonth: deadlineDate.getMonth() + 1,
    deadlineDay: 15,
  };
}

/**
 * 締切までに残り日数（負なら過ぎている）。
 */
export function daysUntilDeadline(today: Date = new Date()): number {
  const cycle = getNextCycle(today);
  const t0 = new Date(today);
  t0.setHours(0, 0, 0, 0);
  const dl = new Date(cycle.deadline + "T00:00:00");
  return Math.round((dl.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 「サイクル申請期間中（締切前）」かどうか。
 * dashboard のリマインダー表示に使う。
 */
export function isRequestPeriod(today: Date = new Date()): boolean {
  return daysUntilDeadline(today) >= 0;
}

/**
 * 互換用：旧 nextMonthRange を残す（呼び出し側を順次置き換え）。
 */
export function nextMonthRange(today: Date = new Date()): {
  start: string;
  end: string;
} {
  const cycle = getNextCycle(today);
  return { start: cycle.start, end: cycle.end };
}
