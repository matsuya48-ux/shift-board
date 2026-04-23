/**
 * SHIFT BOARD のブランドロゴ
 * - 黒い角丸スクエアに白文字の "SB" マーク
 * - サイドに細い装飾ライン＋大文字のブランド名
 */

type Size = "sm" | "md" | "lg";

export function BrandLogo({
  size = "sm",
  tone = "dark",
}: {
  size?: Size;
  tone?: "dark" | "light";
}) {
  const markSize =
    size === "lg" ? "h-12 w-12" : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const markText =
    size === "lg" ? "text-[16px]" : size === "md" ? "text-[12px]" : "text-[10px]";
  const titleSize =
    size === "lg"
      ? "text-[26px]"
      : size === "md"
        ? "text-[17px]"
        : "text-[13px]";
  const accentSize =
    size === "lg"
      ? "text-[11px]"
      : size === "md"
        ? "text-[9px]"
        : "text-[9px]";

  const markBg =
    tone === "dark" ? "bg-[color:var(--ink)]" : "bg-white";
  const markFg = tone === "dark" ? "text-white" : "text-[color:var(--ink)]";
  const titleColor =
    tone === "dark" ? "text-[color:var(--ink)]" : "text-white";
  const accentColor =
    tone === "dark"
      ? "text-[color:var(--accent)]"
      : "text-white/70";

  const markRadius = size === "lg" ? "rounded-[10px]" : "rounded-[8px]";
  const gap = size === "lg" ? "gap-3" : "gap-2.5";

  return (
    <div className={`flex items-center ${gap}`}>
      <div
        className={`${markSize} flex flex-shrink-0 items-center justify-center ${markRadius} ${markBg} ${markFg} shadow-[0_4px_14px_-4px_rgba(26,23,19,0.25)]`}
      >
        <span
          className={`${markText} font-black tracking-[-0.05em] leading-none`}
        >
          SB
        </span>
      </div>
      <div className="min-w-0 leading-none">
        <p
          className={`${accentSize} font-semibold uppercase tracking-[0.35em] ${accentColor}`}
        >
          SHIFT
        </p>
        <p
          className={`${titleSize} font-black uppercase leading-none ${titleColor}`}
          style={{ letterSpacing: "0.08em" }}
        >
          Board
        </p>
      </div>
    </div>
  );
}
