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
        className="pt-1"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          width: "100%",
          maxWidth: "32rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "0.25rem",
          paddingRight: "0.25rem",
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
              className="flex min-w-0 flex-col items-center gap-0.5 px-1 py-1.5"
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                    : "text-[color:var(--ink-3)]"
                }`}
              >
                <Icon
                  className="h-[18px] w-[18px]"
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
              </div>
              <span
                className={`max-w-full truncate text-[10px] leading-tight ${
                  isActive
                    ? "font-medium text-[color:var(--accent)]"
                    : "text-[color:var(--ink-3)]"
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
