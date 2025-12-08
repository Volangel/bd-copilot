import { authOptions } from "@/lib/auth";
import ImportForm from "@/components/projects/import-form";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";

export default async function ImportProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <PageHeader title="Import Projects" description="Upload a CSV with url and optional name columns. Limit 50 rows." mode="pipeline" />
      <div className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <ImportForm />
      </div>
    </>
  );
}
