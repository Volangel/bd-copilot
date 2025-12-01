import TemplateManager from "@/components/templates/template-manager";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const templates = await prisma.template.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 px-8 py-10 md:py-12 lg:px-10 xl:max-w-5xl xl:mx-auto">
      <PageHeader title="Templates" description="Save reusable snippets for outreach." />
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <TemplateManager initial={templates} />
      </Card>
    </div>
  );
}
