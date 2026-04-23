"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarHeart, Users, Settings } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: "ホーム", Icon: Home },
    { href: "/time-off", label: "希望休", Icon: CalendarHeart },
    { href: "/shifts/all", label: "全員", Icon: Users },
    ...(isAdmin
      ? [{ href: "/admin", label: "管理", Icon: Settings }]
      : []),
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--line)] bg-[color:var(--surface)]/90 backdrop-blur-lg">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          width: "100%",
          maxWidth: "32rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "0.25rem",
          paddingRight: "0.25rem",
          paddingTop: "0.35rem",
          paddingBottom: "0.35rem",
          boxSizing: "border-box",
        }}
      >
        {items.map(({ href, label, Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`mx-auto flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                isActive
                  ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                  : "text-[color:var(--ink-3)]"
              }`}
            >
              <Icon
                className="h-[18px] w-[18px] flex-shrink-0"
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`truncate text-[12px] leading-none ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
