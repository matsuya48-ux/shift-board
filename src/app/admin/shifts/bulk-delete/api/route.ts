import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  const warehouseId = url.searchParams.get("warehouse");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { byWarehouse: [], total: 0, error: "invalid month" },
      { status: 400 },
    );
  }

  const [yearStr, monStr] = month.split("-");
  const start = `${month}-01`;
  const lastDay = new Date(Number(yearStr), Number(monStr), 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const supabase = createAdminClient();

  // 倉庫別件数
  let q = supabase
    .from("shifts")
    .select("warehouse_id")
    .gte("work_date", start)
    .lte("work_date", end);

  if (warehouseId) q = q.eq("warehouse_id", warehouseId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      { byWarehouse: [], total: 0, error: error.message },
      { status: 500 },
    );
  }

  const byMap = new Map<string, number>();
  (data ?? []).forEach((r: { warehouse_id: string }) => {
    byMap.set(r.warehouse_id, (byMap.get(r.warehouse_id) ?? 0) + 1);
  });
  const byWarehouse = [...byMap.entries()].map(([warehouseId, count]) => ({
    warehouseId,
    count,
  }));
  const total = data?.length ?? 0;

  return NextResponse.json({ byWarehouse, total });
}
