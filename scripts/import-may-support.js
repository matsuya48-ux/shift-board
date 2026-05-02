/**
 * 5月の応援スタッフ（山元・山崎）をマスタに登録し、シフトを投入する。
 *
 * - 名前: 「山元（応援）」「山崎（応援）」（応援であることが見えるように）
 * - 倉庫: EC物流倉庫
 * - employment_type: part（マスタ制約に '応援' は無いため）
 * - shift_style: free
 * - 登録対象: 5月7,8,11,12,13,14,25,26,27,28日（9:30-15:30）
 *   ※ 5/20 は "△"（仮）のため未登録
 */
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");

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

const EXCEL_PATH = path.resolve(__dirname, "../../2026.5シフト.xlsx");
const YEAR = 2026;
const MONTH = 5;
const DAYS_IN_MONTH = 31;

const SUPPORT_STAFF = [
  { displayName: "山元（応援）" },
  { displayName: "山崎（応援）" },
];

const SUPPORT_ROW_START = 17; // R18 (1-based) = idx 17
const SUPPORT_ROW_END = 18;

function decimalToTime(d) {
  if (typeof d !== "number") return null;
  const totalMin = Math.round(d * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function main() {
  // === Step 1: EC倉庫ID取得
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name");
  const ec = warehouses.find((w) => w.name === "EC物流倉庫");
  if (!ec) throw new Error("EC物流倉庫が見つかりません");

  // === Step 2: 既存スタッフ確認 → 不足分を登録
  const { data: existing } = await supabase
    .from("staffs")
    .select("id, display_name")
    .eq("warehouse_id", ec.id)
    .in(
      "display_name",
      SUPPORT_STAFF.map((s) => s.displayName),
    );
  const existingMap = new Map(
    (existing ?? []).map((s) => [s.display_name, s.id]),
  );

  const toInsert = SUPPORT_STAFF.filter(
    (s) => !existingMap.has(s.displayName),
  );
  if (toInsert.length > 0) {
    console.log(`応援スタッフを新規登録: ${toInsert.length}名`);
    const { data: inserted, error } = await supabase
      .from("staffs")
      .insert(
        toInsert.map((s) => ({
          warehouse_id: ec.id,
          display_name: s.displayName,
          role: "staff",
          employment_type: "part",
          preferred_start_time: "09:30",
          preferred_end_time: "15:30",
          shift_style: "free",
          is_active: true,
        })),
      )
      .select("id, display_name");
    if (error) {
      console.error("スタッフ登録エラー:", error);
      return;
    }
    inserted.forEach((s) => {
      existingMap.set(s.display_name, s.id);
      console.log(`  ✓ ${s.display_name} (id=${s.id.slice(0, 8)}...)`);
    });
  } else {
    console.log("応援スタッフは既に登録済みです");
  }

  // === Step 3: Excelからシフト日を抽出
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const startRow = rows[SUPPORT_ROW_START];
  const endRow = rows[SUPPORT_ROW_END];

  const shiftDates = [];
  for (let day = 1; day <= DAYS_IN_MONTH; day++) {
    const col = 3 + day;
    const startCell = startRow[col];
    const endCell = endRow[col];
    if (typeof startCell !== "number" || typeof endCell !== "number") continue;
    const start = decimalToTime(startCell);
    const end = decimalToTime(endCell);
    if (!start || !end) continue;
    const dateStr = `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    shiftDates.push({ date: dateStr, start, end });
  }

  console.log("");
  console.log(`応援シフト対象日: ${shiftDates.length}日`);
  shiftDates.forEach((s) => {
    console.log(`  ${s.date} ${s.start}-${s.end}`);
  });

  // === Step 4: 各応援スタッフ × 各日のシフトを登録
  // 既存の同日シフトを念のため削除してから投入（再実行可能に）
  const supportIds = SUPPORT_STAFF.map((s) =>
    existingMap.get(s.displayName),
  ).filter(Boolean);

  const { error: delErr, count: delCount } = await supabase
    .from("shifts")
    .delete({ count: "exact" })
    .in("staff_id", supportIds)
    .gte("work_date", `${YEAR}-${String(MONTH).padStart(2, "0")}-01`)
    .lte("work_date", `${YEAR}-${String(MONTH).padStart(2, "0")}-31`);

  if (delErr) {
    console.error("既存シフト削除エラー:", delErr);
    return;
  }
  if ((delCount ?? 0) > 0) {
    console.log("");
    console.log(`既存の応援シフトを削除: ${delCount}件`);
  }

  const records = [];
  for (const staff of SUPPORT_STAFF) {
    const staffId = existingMap.get(staff.displayName);
    for (const s of shiftDates) {
      records.push({
        staff_id: staffId,
        warehouse_id: ec.id,
        work_date: s.date,
        start_time: s.start,
        end_time: s.end,
        break_minutes: 60,
        is_published: true,
        created_by: staffId,
      });
    }
  }

  const { error: insErr, data: insData } = await supabase
    .from("shifts")
    .insert(records)
    .select("id");
  if (insErr) {
    console.error("シフト登録エラー:", insErr);
    return;
  }

  console.log("");
  console.log(`✓ 応援シフト ${insData.length}件 登録完了`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
