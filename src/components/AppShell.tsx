import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/staff-session";
import { BottomNav } from "./BottomNav";
import { AppHeader } from "./AppHeader";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect("/select-staff");
  }

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        paddingBottom:
          "calc(env(safe-area-inset-bottom, 0px) + 6.5rem)",
      }}
    >
      <AppHeader staff={staff} />
      <div className="flex-1">{children}</div>
      <BottomNav isAdmin={staff.role === "admin"} />
    </div>
  );
}
