import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import AdminLayoutShell from "./AdminLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth || auth.role !== "admin") redirect("/login");

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
