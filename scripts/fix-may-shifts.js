/**
 * 5月の空のプレースホルダーシフトを削除し、Excelからのデータを直接INSERTする。
 *
 * 1. start_time IS NULL の5月EC物流シフトを全件削除
 * 2. （本部も同様にチェックして空ならクリア）
 * 3. Excelから読んだ実データを upsert する
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

const EC_STAFF = [
  { name: "堤", rowStart: 5 },
  { name: "内場", rowStart: 7 },
  { name: "鈴木", rowStart: 9 },
  { name: "松田", rowStart: 11 },
  { name: "平井", rowStart: 13 },
  { name: "照山", rowStart: 15 },
];
const HONBU_STAFF = [
  { name: "古藤 聖子", rowStart: 24 },
  { name: "今里 みつみ", rowStart: 26 },
  { name: "内海 麻紀代", rowStart: 28 },
  { name: "川津 有里子", rowStart: 30 },
  { name: "山口 亜樹子", rowStart: 32 },
  { name: "川原 久枝", rowStart: 34 },
  { name: "山下", rowStart: 36 },
];

function decimalToTime(d) {
  if (typeof d !== "number") return null;
  const totalMin = Math.round(d * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseStaffShifts(rows, staffList) {
  const shifts = [];
  const timeOffs = [];
  for (const { name, rowStart } of staffList) {
    const startRow = rows[rowStart];
    const endRow = rows[rowStart + 1];
    if (!startRow || !endRow) continue;
    for (let day = 1; day <= DAYS_IN_MONTH; day++) {
      const col = 3 + day;
      const startCell = startRow[col];
      const endCell = endRow[col];
      const dateStr = `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (startCell === "●") {
        timeOffs.push({ name, date: dateStr });
        continue;
      }
      if (typeof startCell !== "number" || typeof endCell !== "number") continue;
      const start = decimalToTime(startCell);
      const end = decimalToTime(endCell);
      if (!start || !end) continue;
      shifts.push({ name, date: dateStr, start, end });
    }
  }
  return { shifts, timeOffs };
}

async function main() {
  // === Step 1: 倉庫とスタッフのID解決
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name");
  const ec = warehouses.find((w) => w.name === "EC物流倉庫");
  const honbu = warehouses.find((w) => w.name === "本部物流倉庫");

  const { data: allStaffs } = await supabase
    .from("staffs")
    .select("id, display_name, warehouse_id");

  function findStaffId(name, warehouseId) {
    const s = allStaffs.find(
      (x) => x.display_name === name && x.warehouse_id === warehouseId,
    );
    return s?.id;
  }

  // === Step 2: Excel読み込み
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const ecResult = parseStaffShifts(rows, EC_STAFF);
  const honbuResult = parseStaffShifts(rows, HONBU_STAFF);

  console.log(`Excelから読み込み: EC ${ecResult.shifts.length}件, 本部 ${honbuResult.shifts.length}件`);

  // === Step 3: 5月の空シフトを削除（全倉庫）
  console.log("");
  console.log("=== 空のプレースホルダー削除 ===");
  const { error: delErr, count: delCount } = await supabase
    .from("shifts")
    .delete({ count: "exact" })
    .gte("work_date", `${YEAR}-${String(MONTH).padStart(2, "0")}-01`)
    .lte("work_date", `${YEAR}-${String(MONTH).padStart(2, "0")}-31`)
    .is("start_time", null);

  if (delErr) {
    console.error("削除エラー:", delErr);
    return;
  }
  console.log(`空シフトを削除: ${delCount}件`);

  // === Step 4: 既存の同一(staff_id, work_date)のシフトも削除（再投入のため）
  // ECとHonbu両方の対象スタッフID
  const ecStaffIds = EC_STAFF.map((s) => findStaffId(s.name, ec.id)).filter(Boolean);
  const honbuStaffIds = HONBU_STAFF.map((s) => findStaffId(s.name, honbu.id)).filter(Boolean);
  const allTargetIds = [...ecStaffIds, ...honbuStaffIds];

  const { error: del2Err, count: del2Count } = await supabase
    .from("shifts")
    .delete({ count: "exact" })
    .in("staff_id", allTargetIds)
    .gte("work_date", `${YEAR}-${String(MONTH).padStart(2, "0")}-01`)
    .lte("work_date", `${YEAR}-${String(MONTH).padStart(2, "0")}-31`);

  if (del2Err) {
    console.error("既存削除エラー:", del2Err);
    return;
  }
  console.log(`5月の対象スタッフ既存シフトを削除: ${del2Count}件`);

  // === Step 5: ECの実データINSERT
  const ecRecords = ecResult.shifts.map((s) => {
    const staffId = findStaffId(s.name, ec.id);
    return {
      staff_id: staffId,
      warehouse_id: ec.id,
      work_date: s.date,
      start_time: s.start,
      end_time: s.end,
      break_minutes: 60,
      is_published: true,
      created_by: staffId,
    };
  });

  const { error: ecErr, data: ecData } = await supabase
    .from("shifts")
    .insert(ecRecords)
    .select("id");
  if (ecErr) {
    console.error("EC INSERT エラー:", ecErr);
    return;
  }
  console.log(`EC ${ecData.length}件投入`);

  // === Step 6: 本部の実データINSERT
  const honbuRecords = honbuResult.shifts.map((s) => {
    const staffId = findStaffId(s.name, honbu.id);
    return {
      staff_id: staffId,
      warehouse_id: honbu.id,
      work_date: s.date,
      start_time: s.start,
      end_time: s.end,
      break_minutes: 30,
      is_published: true,
      created_by: staffId,
    };
  });

  const { error: hErr, data: hData } = await supabase
    .from("shifts")
    .insert(honbuRecords)
    .select("id");
  if (hErr) {
    console.error("本部 INSERT エラー:", hErr);
    return;
  }
  console.log(`本部 ${hData.length}件投入`);

  // === Step 7: 希望休upsert
  const allTimeOffs = [
    ...ecResult.timeOffs.map((t) => ({ ...t, warehouseId: ec.id })),
    ...honbuResult.timeOffs.map((t) => ({ ...t, warehouseId: honbu.id })),
  ];
  const timeOffRecords = allTimeOffs
    .map((t) => {
      const staffId = findStaffId(t.name, t.warehouseId);
      if (!staffId) return null;
      return {
        staff_id: staffId,
        request_date: t.date,
        status: "approved",
        decided_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  const { error: tErr, count: tCount } = await supabase
    .from("time_off_requests")
    .upsert(timeOffRecords, {
      onConflict: "staff_id,request_date",
      ignoreDuplicates: true,
      count: "exact",
    });
  if (tErr) {
    console.error("希望休 UPSERT エラー:", tErr);
    return;
  }
  console.log(`希望休 ${tCount ?? timeOffRecords.length}件 upsert`);

  console.log("");
  console.log("✅ 完了しました");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
