/**
 * 2026.5シフト.xlsx から 5月分のシフトを抽出し、INSERT SQL を生成する
 */
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const EXCEL_PATH = path.resolve(__dirname, "../../2026.5シフト.xlsx");
const OUT_SQL = path.resolve(__dirname, "../../sql/013_may_shifts.sql");

// スタッフマッピング（エクセルの行位置 → DB の display_name）
const EC_STAFF = [
  { name: "堤", rowStart: 5 },        // R6
  { name: "内場", rowStart: 7 },      // R8
  { name: "鈴木", rowStart: 9 },      // R10
  { name: "松田", rowStart: 11 },     // R12
  { name: "平井", rowStart: 13 },     // R14
  { name: "照山", rowStart: 15 },     // R16
];

// 5月は本部が1行下にズレている（4月: R24=古藤 → 5月: R25=古藤）
const HONBU_STAFF = [
  { name: "古藤 聖子", rowStart: 24 },     // R25
  { name: "今里 みつみ", rowStart: 26 },   // R27
  { name: "内海 麻紀代", rowStart: 28 },   // R29
  { name: "川津 有里子", rowStart: 30 },   // R31
  { name: "山口 亜樹子", rowStart: 32 },   // R33
  { name: "川原 久枝", rowStart: 34 },     // R35
  { name: "山下", rowStart: 36 },          // R37
];

const YEAR = 2026;
const MONTH = 5;
const DAYS_IN_MONTH = 31;

function decimalToTime(d) {
  if (typeof d !== "number") return null;
  const totalMin = Math.round(d * 24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseStaffShifts(rows, staffList, year, month) {
  const shifts = [];
  const timeOffs = [];
  const skipped = [];

  for (const { name, rowStart } of staffList) {
    const startRow = rows[rowStart];
    const endRow = rows[rowStart + 1];
    if (!startRow || !endRow) continue;

    // 日付列は index 4 から
    for (let day = 1; day <= DAYS_IN_MONTH; day++) {
      const col = 3 + day; // index 4 = day 1
      const startCell = startRow[col];
      const endCell = endRow[col];
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // ●は希望休
      if (startCell === "●") {
        timeOffs.push({ name, date: dateStr });
        continue;
      }

      // 数値でなければスキップ（△・有休・運動会予備・空欄など）
      if (typeof startCell !== "number" || typeof endCell !== "number") {
        if (startCell !== "" && startCell !== undefined) {
          skipped.push({ name, date: dateStr, value: startCell });
        }
        continue;
      }

      const start = decimalToTime(startCell);
      const end = decimalToTime(endCell);
      if (!start || !end) continue;

      shifts.push({ name, date: dateStr, start, end });
    }
  }

  return { shifts, timeOffs, skipped };
}

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

function main() {
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const ecResult = parseStaffShifts(rows, EC_STAFF, YEAR, MONTH);
  const honbuResult = parseStaffShifts(rows, HONBU_STAFF, YEAR, MONTH);

  console.log("EC シフト件数:", ecResult.shifts.length);
  console.log("EC 希望休件数:", ecResult.timeOffs.length);
  console.log("本部 シフト件数:", honbuResult.shifts.length);
  console.log("本部 希望休件数:", honbuResult.timeOffs.length);

  if (ecResult.skipped.length > 0 || honbuResult.skipped.length > 0) {
    console.log("");
    console.log("数値以外でスキップしたセル（要確認）:");
    [...ecResult.skipped, ...honbuResult.skipped].forEach((s) => {
      console.log(`  ${s.name} ${s.date}: ${JSON.stringify(s.value)}`);
    });
  }

  const lines = [];
  lines.push("-- ============================================================");
  lines.push(`-- ${YEAR}年${MONTH}月 シフト・希望休の転記（エクセルより）`);
  lines.push("-- ============================================================");
  lines.push("");

  // EC シフト
  lines.push("-- EC物流倉庫のシフト");
  lines.push(
    `insert into shifts (staff_id, warehouse_id, work_date, start_time, end_time, break_minutes, is_published, created_by)`,
  );
  lines.push("values");

  const ecRows = ecResult.shifts.map(
    (s) => `  (
    (select id from staffs where display_name = '${escapeSqlString(s.name)}' and warehouse_id = (select id from warehouses where name = 'EC物流倉庫') limit 1),
    (select id from warehouses where name = 'EC物流倉庫'),
    '${s.date}',
    '${s.start}',
    '${s.end}',
    60,
    true,
    (select id from staffs where display_name = '${escapeSqlString(s.name)}' and warehouse_id = (select id from warehouses where name = 'EC物流倉庫') limit 1)
  )`,
  );
  lines.push(ecRows.join(",\n"));
  lines.push("on conflict (staff_id, work_date) do nothing;");
  lines.push("");

  // 本部 シフト
  lines.push("-- 本部物流倉庫のシフト");
  lines.push(
    `insert into shifts (staff_id, warehouse_id, work_date, start_time, end_time, break_minutes, is_published, created_by)`,
  );
  lines.push("values");

  const honbuRows = honbuResult.shifts.map(
    (s) => `  (
    (select id from staffs where display_name = '${escapeSqlString(s.name)}' and warehouse_id = (select id from warehouses where name = '本部物流倉庫') limit 1),
    (select id from warehouses where name = '本部物流倉庫'),
    '${s.date}',
    '${s.start}',
    '${s.end}',
    30,
    true,
    (select id from staffs where display_name = '${escapeSqlString(s.name)}' and warehouse_id = (select id from warehouses where name = '本部物流倉庫') limit 1)
  )`,
  );
  lines.push(honbuRows.join(",\n"));
  lines.push("on conflict (staff_id, work_date) do nothing;");
  lines.push("");

  // 希望休
  const allTimeOffs = [
    ...ecResult.timeOffs.map((t) => ({ ...t, warehouse: "EC物流倉庫" })),
    ...honbuResult.timeOffs.map((t) => ({ ...t, warehouse: "本部物流倉庫" })),
  ];

  if (allTimeOffs.length > 0) {
    lines.push("-- 希望休（スプシで ● になっている日 = 承認済みとして登録）");
    lines.push(
      `insert into time_off_requests (staff_id, request_date, status, decided_at)`,
    );
    lines.push("values");
    const offRows = allTimeOffs.map(
      (t) => `  (
    (select id from staffs where display_name = '${escapeSqlString(t.name)}' and warehouse_id = (select id from warehouses where name = '${t.warehouse}') limit 1),
    '${t.date}',
    'approved',
    now()
  )`,
    );
    lines.push(offRows.join(",\n"));
    lines.push("on conflict (staff_id, request_date) do nothing;");
  }

  fs.writeFileSync(OUT_SQL, lines.join("\n"), "utf8");
  console.log("");
  console.log("書き出し完了:", OUT_SQL);
}

main();
