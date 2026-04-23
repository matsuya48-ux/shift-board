"use client";

import { useState, useTransition, useMemo } from "react";
import { Search, Loader2, ChevronRight, Shield } from "lucide-react";
import { selectStaff } from "../actions";

type Staff = {
  id: string;
  display_name: string;
  role: "staff" | "admin";
  warehouse_id: string;
  warehouses: { name: string } | null;
};

type Warehouse = { id: string; name: string };

export function StaffSelector({
  staffs,
  warehouses,
}: {
  staffs: Staff[];
  warehouses: Warehouse[];
}) {
  const [query, setQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = staffs;
    if (warehouseFilter) {
      list = list.filter((s) => s.warehouse_id === warehouseFilter);
    }
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((s) => s.display_name.includes(q));
    }
    return list;
  }, [staffs, query, warehouseFilter]);

  function handleSelect(staffId: string) {
    setLoadingId(staffId);
    startTransition(async () => {
      await selectStaff(staffId);
    });
  }

  if (staffs.length === 0) {
    return (
      <div className="rounded-3xl bg-[color:var(--surface)] p-10 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[14px] font-semibold text-[color:var(--ink)]">
          スタッフが登録されていません
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ink-3)]">
          管理者の方は初回セットアップとして、
          <br />
          SQL Editorでスタッフを追加してください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 検索ボックス */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ink-3)]"
          strokeWidth={1.8}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前で検索"
          className="h-12 w-full rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] pl-11 pr-4 text-[14px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-4)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-4 focus:ring-[color:var(--accent-soft)]"
        />
      </div>

      {/* 拠点フィルタ */}
      {warehouses.length > 1 && (
        <div className="flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface)] p-1 shadow-[var(--shadow-sm)]">
          <button
            type="button"
            onClick={() => setWarehouseFilter(null)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
              !warehouseFilter
                ? "bg-[color:var(--accent)] text-white"
                : "text-[color:var(--ink-3)]"
            }`}
          >
            すべて
          </button>
          {warehouses.map((wh) => {
            const active = warehouseFilter === wh.id;
            return (
              <button
                key={wh.id}
                type="button"
                onClick={() => setWarehouseFilter(wh.id)}
                className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--ink-3)]"
                }`}
              >
                {wh.name.replace("物流倉庫", "")}
              </button>
            );
          })}
        </div>
      )}

      {/* スタッフ一覧 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-[color:var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
            <p className="text-[13px] text-[color:var(--ink-3)]">
              該当するスタッフがいません
            </p>
          </div>
        ) : (
          filtered.map((s) => {
            const firstWord = s.display_name.split(/\s+/)[0] ?? "";
            const initial = firstWord.slice(0, 2) || "?";
            const loading = loadingId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                disabled={isPending}
                className="flex w-full items-center gap-3.5 rounded-2xl bg-[color:var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <div
                  className={`flex h-11 min-w-[2.75rem] flex-shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-semibold ${
                    s.role === "admin"
                      ? "bg-[color:var(--ink)] text-white"
                      : "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                  }`}
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[15px] font-semibold text-[color:var(--ink)]">
                      {s.display_name}
                    </p>
                    {s.role === "admin" && (
                      <Shield
                        className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--ink-3)]"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <p className="truncate text-[11px] text-[color:var(--ink-3)]">
                    {s.warehouses?.name ?? "—"}
                  </p>
                </div>
                {loading ? (
                  <Loader2
                    className="h-4 w-4 flex-shrink-0 animate-spin text-[color:var(--ink-3)]"
                    strokeWidth={2}
                  />
                ) : (
                  <ChevronRight
                    className="h-4 w-4 flex-shrink-0 text-[color:var(--ink-4)]"
                    strokeWidth={2}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
