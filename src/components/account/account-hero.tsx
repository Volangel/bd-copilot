import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import Link from "next/link";

type HeroProps = {
  name: string | null;
  url: string;
  stage?: string | null;
  status: string;
  icpScore?: number | null;
  mqaScore?: number | null;
  sequenceCount: number;
  nextTouch?: Date | null;
  projectId: string;
};

export function AccountHero({ name, url, stage, status, icpScore, mqaScore, sequenceCount, nextTouch, projectId }: HeroProps) {
  const displayName = name || url;
  const domain = url?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-white">{displayName}</h1>
          {stage ? <Badge variant="outline">{stage}</Badge> : null}
          <Badge variant="primary" className="uppercase tracking-wide">{status}</Badge>
          {sequenceCount > 0 ? <Badge variant="info">{sequenceCount} sequences</Badge> : null}
          {nextTouch ? <Badge variant="success">Next touch {nextTouch.toLocaleDateString()}</Badge> : null}
        </div>
        <p className="text-sm text-slate-400">{domain}</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          {icpScore ? <Badge variant="neutral">ICP {icpScore}</Badge> : null}
          {mqaScore ? <Badge variant="neutral">MQA {mqaScore}</Badge> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-200">
        <Link href={`/projects/${projectId}/contact-workbench`} className="rounded-md border border-[#232527] bg-[#181A1C] px-3 py-2 hover:bg-[#1E2022]">
          Contact Workbench
        </Link>
        <Link href={`/session`} className="rounded-md border border-[#232527] bg-[#181A1C] px-3 py-2 hover:bg-[#1E2022]">
          Session Mode
        </Link>
        <Link href="/radar" className="rounded-md border border-[#232527] bg-[#181A1C] px-3 py-2 hover:bg-[#1E2022]">
          Radar
        </Link>
      </div>
    </Panel>
  );
}
