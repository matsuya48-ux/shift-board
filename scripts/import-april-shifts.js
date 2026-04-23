/**
 * 2026.4シフト.xlsx から 4月分のシフトを抽出し、INSERT SQL を生成する
 */
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const EXCEL_PATH = path.resolve(
  __dirname,
  "../../2026.4シフト.xlsx",
);
const OUT_SQL = path.resolve(__dirname, "../../sql/007_april_shifts.sql");

// スタッフマッピング（エクセルの表示名 → DB の display_name）
const EC_STAFF = [
  { name: "堤", rowStart: 5 },        // 0-based: R6
  { name: "内場", rowStart: 7 },      // R8
  { name: "鈴木", rowStart: 9 },      // R10
  { name: "松田", rowStart: 11 },     // R12
  { name: "平井", rowStart: 13 },     // R14
  { name: "照山", rowStart: 15 },     // R16
];

const HONBU_STAFF = [
  { name: "古藤 聖子", rowStart: 23 },     // R24 (古藤)
  { name: "今里 みつみ", rowStart: 25 },   // R26 (今里)
  { name: "内海 麻紀代", rowStart: 27 },   // R28 (内海)
  { name: "川津 有里子", rowStart: 29 },   // R30 (川津)
  { name: "山口 亜樹子", rowStart: 31 },   // R32 (山口)
  { name: "川原 久枝", rowStart: 33 },     // R34 (川原)
  { name: "山下", rowStart: 35 },          // R36 (山下) — 新規登録必要
];

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

  for (const { name, rowStart } of staffList) {
    const startRow = rows[rowStart];
    const endRow = rows[rowStart + 1];
    if (!startRow || !endRow) continue;

    // 日付列は index 4 から。4月は30日まで
    for (let day = 1; day <= 30; day++) {
      const col = 3 + day; // index 4 = day 1
      const startCell = startRow[col];
      const endCell = endRow[col];

      // ●は希望休
      if (startCell === "●") {
        timeOffs.push({
          name,
          date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        });
        continue;
      }

      // 数値でなければスキップ
      if (typeof startCell !== "number" || typeof endCell !== "number") continue;

      const start = decimalToTime(startCell);
      const end = decimalToTime(endCell);
      if (!start || !end) continue;

      shifts.push({
        name,
        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        start,
        end,
      });
    }
  }

  return { shifts, timeOffs };
}

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

function main() {
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const { shifts: ecShifts, timeOffs: ecTimeOffs } = parseStaffShifts(
    rows,
    EC_STAFF,
    2026,
    4,
  );
  const { shifts: honbuShifts, timeOffs: honbuTimeOffs } = parseStaffShifts(
    rows,
    HONBU_STAFF,
    2026,
    4,
  );

  console.log("EC シフト件数:", ecShifts.length);
  console.log("EC 希望休件数:", ecTimeOffs.length);
  console.log("本部 シフト件数:", honbuShifts.length);
  console.log("本部 希望休件数:", honbuTimeOffs.length);

  const lines = [];
  lines.push(
    "-- ============================================================",
  );
  lines.push("-- 2026年4月 シフト・希望休の転記（エクセルより）");
  lines.push(
    "-- ============================================================",
  );
  lines.push("");

  // 山下（本部）の追加登録（まだマスタに無ければ）
  lines.push("-- 山下さんを本部スタッフとして追加（存在しなければ）");
  lines.push(
    `insert into staffs (warehouse_id, display_name, role, employment_type, preferred_start_time, preferred_end_time, shift_style)`,
  );
  lines.push(
    `select id, '山下', 'staff', 'part', '09:00', '18:00', 'pattern'`,
  );
  lines.push(
    `from warehouses where name = '本部物流倉庫' and not exists (`,
  );
  lines.push(
    `  select 1 from staffs where display_name = '山下' and warehouse_id = (select id from warehouses where name = '本部物流倉庫')`,
  );
  lines.push(");");
  lines.push("");

  // EC シフト
  lines.push("-- EC物流倉庫のシフト");
  lines.push(
    `insert into shifts (staff_id, warehouse_id, work_date, start_time, end_time, break_minutes, is_published, created_by)`,
  );
  lines.push("values");

  const ecRows = ecShifts.map(
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

  const honbuRows = honbuShifts.map(
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
    ...ecTimeOffs.map((t) => ({ ...t, warehouse: "EC物流倉庫" })),
    ...honbuTimeOffs.map((t) => ({ ...t, warehouse: "本部物流倉庫" })),
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
  console.log("書き出し完了:", OUT_SQL);
}

main();
