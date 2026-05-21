/**
 * 確定済みのマッピングで DB スタッフに employee_code と employment_type を反映する。
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

// (display_name → { employee_code, employment_type })
// employment_type: "full"=正社員, "short"=短時間社員, "part"=パート
const MAPPINGS = [
  { name: "今里 みつみ", code: "974", emp: "part" },
  { name: "内場 早野佳", code: "1029", emp: "part" },
  { name: "内海 麻紀代", code: "1033", emp: "part" },
  { name: "古藤 聖子", code: "936", emp: "short" },
  { name: "堤　洋子", code: "799", emp: "short" },
  { name: "山下　和朗", code: "1078", emp: "full" },
  { name: "山元（応援）", code: "992", emp: "part" },
  { name: "山口 亜樹子", code: "1057", emp: "part" },
  { name: "川原 久枝", code: "1065", emp: "short" },
  { name: "川津 有里子", code: "1051", emp: "part" },
  { name: "平井　愛未衣", code: "1043", emp: "part" },
  { name: "松田　奈津江", code: "1041", emp: "part" },
  { name: "照山　麻美", code: "1072", emp: "part" },
  { name: "鈴木　玲奈", code: "1042", emp: "part" },
];

async function main() {
  let ok = 0;
  let skipped = [];
  let failed = [];

  for (const m of MAPPINGS) {
    const { data: rows, error: findErr } = await supabase
      .from("staffs")
      .select("id, display_name, employee_code, employment_type")
      .eq("display_name", m.name);

    if (findErr) {
      failed.push({ ...m, reason: findErr.message });
      continue;
    }
    if (!rows || rows.length === 0) {
      skipped.push({ ...m, reason: "DBに該当スタッフなし" });
      continue;
    }
    if (rows.length > 1) {
      skipped.push({ ...m, reason: `DBに複数スタッフあり (${rows.length}件)` });
      continue;
    }

    const target = rows[0];

    const { error: upErr } = await supabase
      .from("staffs")
      .update({
        employee_code: m.code,
        employment_type: m.emp,
      })
      .eq("id", target.id);

    if (upErr) {
      failed.push({ ...m, reason: upErr.message });
      continue;
    }

    console.log(
      `✓ ${m.name} → 社番:${m.code} / 雇用形態:${m.emp} （前: ${target.employee_code ?? "なし"} / ${target.employment_type}）`,
    );
    ok++;
  }

  console.log("");
  console.log(`完了: ${ok}件 更新`);
  if (skipped.length > 0) {
    console.log("");
    console.log("スキップ:");
    skipped.forEach((s) =>
      console.log(`  ${s.name}: ${s.reason}`),
    );
  }
  if (failed.length > 0) {
    console.log("");
    console.log("失敗:");
    failed.forEach((f) =>
      console.log(`  ${f.name}: ${f.reason}`),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
