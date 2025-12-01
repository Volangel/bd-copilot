import Link from "next/link";

type Step = { label: string; done: boolean; href: string };

export function OnboardingChecklist({ steps }: { steps: Step[] }) {
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">Let’s get your BD cockpit ready</p>
          <p className="text-sm text-slate-400">Complete these steps and you’ll have a working pipeline in minutes.</p>
          <p className="mt-1 text-xs text-slate-500">
            {completed} of {total} done
          </p>
        </div>
        <div className="relative h-2 w-28 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/15"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-4 w-4 rounded-full border ${step.done ? "border-emerald-400 bg-emerald-400" : "border-slate-600"}`}
              />
              <span className={step.done ? "text-slate-500 line-through" : ""}>{step.label}</span>
            </div>
            <Link href={step.href} className="text-xs text-emerald-300 hover:underline">
              {step.done ? "Review" : "Open"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
