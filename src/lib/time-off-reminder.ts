import { toISODate } from "./hours";

/**
 * シフトサイクル: カレンダー月（1日〜末日）。
 * 締切: 申請対象月の前月22日。
 *
 * 例：
 *   5月1日時点  → 申請対象「6月度（6月1日〜6月30日）」、締切 5月22日
 *   5月22日時点 → 同じく「6月度」、締切は今日
 *   5月23日時点 → 申請対象「7月度（7月1日〜7月31日）」、締切 6月22日
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

const DEADLINE_DAY = 22;

/**
 * 「次のサイクル（締切がまだ過ぎていないサイクル）」を返す。
 *
 * - 今日が当月22日以前 → 申請対象 = 翌月度、締切 = 当月22日
 * - 今日が当月22日より後 → 申請対象 = 翌々月度、締切 = 翌月22日
 */
export function getNextCycle(today: Date = new Date()): TimeOffCycle {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  const day = today.getDate();

  // 締切月オフセット（当月か翌月か）
  const deadlineMonthOffset = day <= DEADLINE_DAY ? 0 : 1;
  // サイクル月オフセット（締切月の翌月）
  const cycleMonthOffset = deadlineMonthOffset + 1;

  const startDate = new Date(y, m + cycleMonthOffset, 1);
  const endDate = new Date(y, m + cycleMonthOffset + 1, 0);
  const deadlineDate = new Date(y, m + deadlineMonthOffset, DEADLINE_DAY);

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
 * ダッシュボードのリマインダーを表示すべき期間か。
 * - 当月15日以前: 表示しない
 * - 当月16日〜22日: 表示する（締切まで）
 */
export function shouldShowReminder(today: Date = new Date()): boolean {
  const day = today.getDate();
  if (day < 16) return false;
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

/** サイクルを 'YYYY-MM' 文字列に変換（time_off_no_requests の cycle_month 用） */
export function cycleMonthKey(cycle: TimeOffCycle): string {
  return cycle.start.slice(0, 7);
}
