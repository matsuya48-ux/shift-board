import { toISODate } from "./hours";

/**
 * 「翌月分の希望休提出期間中」かどうかを判定する。
 * 毎月1日〜10日を提出期間と定義。
 */
export function isRequestPeriod(today: Date = new Date()): boolean {
  const day = today.getDate();
  return day >= 1 && day <= 10;
}

/**
 * 翌月の1日〜末日のISO日付範囲を返す。
 */
export function nextMonthRange(today: Date = new Date()): {
  start: string;
  end: string;
} {
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 0-indexed → next month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}
