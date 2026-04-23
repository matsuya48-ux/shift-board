import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/staff-session";

export default async function Home() {
  const staff = await getCurrentStaff();
  if (staff) {
    redirect("/dashboard");
  }
  redirect("/select-staff");
}
