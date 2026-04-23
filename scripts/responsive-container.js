/**
 * 全ページの inline style の container div を
 * レスポンシブ Tailwind classes に置換
 */
const fs = require("fs");
const path = require("path");

const FILES = [
  "src/app/admin/announcements/page.tsx",
  "src/app/admin/events/page.tsx",
  "src/app/admin/label-overrides/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/admin/patterns/page.tsx",
  "src/app/admin/settings/page.tsx",
  "src/app/admin/shifts/auto/page.tsx",
  "src/app/admin/shifts/board/page.tsx",
  "src/app/admin/shifts/page.tsx",
  "src/app/admin/shifts/[staffId]/page.tsx",
  "src/app/admin/staffs/new/page.tsx",
  "src/app/admin/staffs/page.tsx",
  "src/app/admin/staffs/[id]/page.tsx",
  "src/app/admin/time-off/page.tsx",
  "src/app/admin/weekday-labels/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/shifts/me/page.tsx",
  "src/app/time-off/page.tsx",
];

/** maxWidthの値に応じたレスポンシブクラスを返す */
function getMaxClass(mw) {
  if (mw === "80rem") return "sm:max-w-7xl";
  if (mw === "56rem") return "sm:max-w-4xl";
  // 32rem / 36rem 等
  return "sm:max-w-2xl";
}

// 複数行のinline styleを検出
const pattern =
  /style=\{\{\s*\n\s*width:\s*"100%",\s*\n\s*maxWidth:\s*"([^"]+)",\s*\n\s*marginLeft:\s*"auto",\s*\n\s*marginRight:\s*"auto",\s*\n\s*paddingLeft:\s*"[^"]+",\s*\n\s*paddingRight:\s*"[^"]+",\s*\n\s*paddingTop:\s*"[^"]+",\s*\n\s*paddingBottom:\s*"[^"]+",\s*\n\s*boxSizing:\s*"border-box",\s*\n\s*\}\}(\s*\n\s*className="([^"]+)")?/;

const responsiveClasses =
  "mx-auto w-full px-4 pb-8 pt-6 sm:px-6 md:px-8 landscape:px-6";

let updated = 0;
for (const rel of FILES) {
  const full = path.resolve(__dirname, "..", rel);
  let content = fs.readFileSync(full, "utf8");
  const m = content.match(pattern);
  if (!m) {
    console.log("SKIP (no match):", rel);
    continue;
  }
  const [whole, mw, , existingClass] = m;
  const maxClass = getMaxClass(mw);
  const combined = [responsiveClasses, maxClass, existingClass || ""]
    .filter(Boolean)
    .join(" ");
  const replacement = `className="${combined}"`;
  content = content.replace(pattern, replacement);
  fs.writeFileSync(full, content, "utf8");
  console.log("UPDATED:", rel, "→", combined);
  updated++;
}

console.log(`\nTotal: ${updated} files updated`);
