import { toISODate } from "./hours";

export type WeekdayLabel = {
  id: string;
  warehouse_id: string;
  weekday: number;
  label: string;
  color: string | null;
};

export type DateLabelOverride = {
  id: string;
  warehouse_id: string;
  override_date: string;
  label: string;
  action: "add" | "skip";
  color: string | null;
};

export type EffectiveLabel = {
  label: string;
  color: string;
  source: "base" | "added";
};

/**
 * 指定日の有効なラベル一覧を返す。
 * 既定の曜日ラベルから、'skip' 指定されたものを除外し、'add' で追加されたものを足す。
 */
export function resolveLabelsForDate(
  date: Date,
  warehouseId: string,
  baseLabels: WeekdayLabel[],
  overrides: DateLabelOverride[],
): EffectiveLabel[] {
  const dateStr = toISODate(date);
  const wd = date.getDay();

  const whBase = baseLabels.filter(
    (l) => l.warehouse_id === warehouseId && l.weekday === wd,
  );

  const whOverrides = overrides.filter(
    (o) => o.warehouse_id === warehouseId && o.override_date === dateStr,
  );
  const skipped = new Set(
    whOverrides.filter((o) => o.action === "skip").map((o) => o.label),
  );

  const base = whBase
    .filter((l) => !skipped.has(l.label))
    .map<EffectiveLabel>((l) => ({
      label: l.label,
      color: l.color ?? "#5a7d9a",
      source: "base",
    }));

  const added = whOverrides
    .filter((o) => o.action === "add")
    .map<EffectiveLabel>((o) => ({
      label: o.label,
      color: o.color ?? "#5a7d9a",
      source: "added",
    }));

  return [...base, ...added];
}
