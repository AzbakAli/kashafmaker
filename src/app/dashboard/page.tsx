import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/services/rides";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getDashboardStats();

  return (
    <AppLayout>
      <DashboardContent initialData={data} />
    </AppLayout>
  );
}
