/**
 * 5月の△（予備）シフトを is_tentative=true で投入する。
 *
 * 対象（エクセル R12〜R36 の△セル）:
 *   - 松田 5/27（運動会予備）
 *   - 古藤 聖子 5/19（メモなし）
 *   - 古藤 聖子 5/27（運動会予備）
 *   - 山元（応援） 5/20（メモなし）
 *   - 山崎（応援） 5/20（メモなし）
 *
 * 前提: sql/015_add_shift_tentative.sql 実行済み（is_tentative 列追加）。
 */
const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, "../.env.local");
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TENTATIVES = [
  { staffName: "松田", warehouseName: "EC物流倉庫", date: "2026-05-27", note: "運動会予備" },
  { staffName: "古藤 聖子", warehouseName: "本部物流倉庫", date: "2026-05-19", note: null },
  { staffName: "古藤 聖子", warehouseName: "本部物流倉庫", date: "2026-05-27", note: "運動会予備" },
  { staffName: "山元（応援）", warehouseName: "EC物流倉庫", date: "2026-05-20", note: "応援予備" },
  { staffName: "山崎（応援）", warehouseName: "EC物流倉庫", date: "2026-05-20", note: "応援予備" },
];

async function main() {
  // 倉庫ID解決
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name");
  const whMap = new Map(warehouses.map((w) => [w.name, w.id]));

  // スタッフID解決
  const names = [...new Set(TENTATIVES.map((t) => t.staffName))];
  const { data: staffs } = await supabase
    .from("staffs")
    .select("id, display_name, warehouse_id")
    .in("display_name", names);

  function resolveStaffId(staffName, warehouseName) {
    const whId = whMap.get(warehouseName);
    return staffs.find(
      (s) => s.display_name === staffName && s.warehouse_id === whId,
    )?.id;
  }

  const records = TENTATIVES.map((t) => {
    const whId = whMap.get(t.warehouseName);
    const staffId = resolveStaffId(t.staffName, t.warehouseName);
    if (!whId || !staffId) {
      console.warn(`スタッフ未解決: ${t.staffName} @ ${t.warehouseName}`);
      return null;
    }
    return {
      staff_id: staffId,
      warehouse_id: whId,
      work_date: t.date,
      start_time: null,
      end_time: null,
      break_minutes: 0,
      is_published: true,
      is_tentative: true,
      note: t.note,
      created_by: staffId,
    };
  }).filter(Boolean);

  // 既存の同日予備を一旦削除（再実行可能に）
  const targetIds = [...new Set(records.map((r) => r.staff_id))];
  const targetDates = [...new Set(records.map((r) => r.work_date))];
  for (const staffId of targetIds) {
    for (const date of targetDates) {
      const { error: delErr } = await supabase
        .from("shifts")
        .delete()
        .eq("staff_id", staffId)
        .eq("work_date", date)
        .eq("is_tentative", true);
      if (delErr) {
        console.warn(`削除失敗 (${staffId.slice(0, 8)} ${date}):`, delErr.message);
      }
    }
  }

  // 投入
  const { error, data } = await supabase
    .from("shifts")
    .insert(records)
    .select("id");
  if (error) {
    console.error("投入エラー:", error);
    return;
  }
  console.log(`✓ 予備(△)シフト ${data.length}件 投入完了`);
  records.forEach((r) => {
    const staff = staffs.find((s) => s.id === r.staff_id);
    console.log(
      `  ${r.work_date} ${staff?.display_name ?? "?"} (note: ${r.note ?? "-"})`,
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
