/**
 * SHIFT BOARD のブランドロゴ
 * 1行レイアウト：[SB] SHIFT BOARD
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
    size === "lg" ? "h-8 w-8" : size === "md" ? "h-7 w-7" : "h-6 w-6";
  const markText =
    size === "lg" ? "text-[12px]" : "text-[10px]";
  const titleSize =
    size === "lg"
      ? "text-[18px]"
      : size === "md"
        ? "text-[15px]"
        : "text-[13px]";
  const gap = size === "lg" ? "gap-2.5" : "gap-2";

  const markBg = tone === "dark" ? "bg-[color:var(--ink)]" : "bg-white";
  const markFg = tone === "dark" ? "text-white" : "text-[color:var(--ink)]";
  const titleColor =
    tone === "dark" ? "text-[color:var(--ink)]" : "text-white";
  const accentColor =
    tone === "dark"
      ? "text-[color:var(--accent)]"
      : "text-white/80";

  return (
    <div className={`flex items-center ${gap}`}>
      <div
        className={`${markSize} flex flex-shrink-0 items-center justify-center rounded-[8px] ${markBg} ${markFg} shadow-[0_3px_10px_-4px_rgba(26,23,19,0.25)]`}
      >
        <span
          className={`${markText} font-black tracking-[-0.05em] leading-none`}
        >
          SB
        </span>
      </div>
      <p
        className={`${titleSize} font-bold uppercase leading-none tracking-[0.1em] ${titleColor}`}
      >
        SHIFT <span className={accentColor}>BOARD</span>
      </p>
    </div>
  );
}
