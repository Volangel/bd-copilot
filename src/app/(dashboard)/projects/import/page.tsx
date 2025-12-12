import { authOptions } from "@/lib/auth";
import ImportForm from "@/components/projects/import-form";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import Link from "next/link";

export default async function ImportProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Projects"
        description="Upload a CSV with url and optional name columns. Limit 50 rows."
        mode="pipeline"
        actions={
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Projects
          </Link>
        }
      />

      {/* Import instructions card */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">CSV Format Requirements</p>
            <ul className="space-y-1 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Required column: <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">url</code> - the project website URL</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Optional column: <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">name</code> - the project display name</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span>Maximum of 50 rows per import</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Import form card */}
      <div className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/30">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Upload your CSV file</p>
            <p className="text-xs text-slate-400">Select a file to begin the import process</p>
          </div>
        </div>
        <ImportForm />
      </div>
    </div>
  );
}
