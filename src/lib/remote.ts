/**
 * リモート作業報告の計算ヘルパー
 */

export function diffMinutesHHMM(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

/** 作業時間（時間単位、小数2桁丸めず生値） */
export function workHours(start: string, end: string): number {
  return diffMinutesHHMM(start, end) / 60;
}

/** 1時間あたりの件数 */
export function itemsPerHour(
  start: string,
  end: string,
  itemCount: number,
): number {
  const h = workHours(start, end);
  if (h <= 0) return 0;
  return itemCount / h;
}

/** 表示用：時間（小数1桁、末尾.0は省略） */
export function fmtHours1(h: number): string {
  const s = h.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** 表示用：件/h（小数1桁、末尾.0は省略） */
export function fmtPerHour(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return "0";
  const s = rate.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}
