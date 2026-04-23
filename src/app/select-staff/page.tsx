import { createAdminClient } from "@/lib/supabase/admin";
import { StaffSelector } from "./_components/StaffSelector";
import { BrandLogo } from "@/components/BrandLogo";

type StaffRow = {
  id: string;
  display_name: string;
  role: "staff" | "admin";
  warehouse_id: string;
  warehouses: { name: string } | null;
};

export default async function SelectStaffPage() {
  const supabase = createAdminClient();

  const [{ data: staffsRaw }, { data: warehouses }] = await Promise.all([
    supabase
      .from("staffs")
      .select("id, display_name, role, warehouse_id, warehouses(name)")
      .eq("is_active", true)
      .order("display_name"),
    supabase.from("warehouses").select("id, name").order("name"),
  ]);

  const staffs = (staffsRaw ?? []) as unknown as StaffRow[];

  return (
    <main className="flex min-h-screen flex-col px-6 pb-10 pt-10">
      <div
        style={{
          width: "100%",
          maxWidth: "32rem",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        className="animate-rise"
      >
        <header className="mb-8">
          <div className="mb-6 flex justify-center">
            <BrandLogo size="md" />
          </div>
          <h1 className="text-center text-[22px] font-semibold leading-[1.4] tracking-tight text-[color:var(--ink)]">
            あなたの名前を選んでください
          </h1>
        </header>

        <StaffSelector staffs={staffs} warehouses={warehouses ?? []} />
      </div>
    </main>
  );
}
