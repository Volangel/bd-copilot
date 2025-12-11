"use client";

import { cn } from "@/components/ui/utils";

interface AccountProgressProps {
  hasSummary: boolean;
  hasPlaybook: boolean;
  hasContacts: boolean;
  hasSequence: boolean;
  hasInteraction: boolean;
  className?: string;
}

const steps = [
  { key: "summary", label: "Analysis", icon: "📊" },
  { key: "playbook", label: "Playbook", icon: "📋" },
  { key: "contacts", label: "Contacts", icon: "👥" },
  { key: "sequence", label: "Sequence", icon: "📬" },
  { key: "interaction", label: "Outreach", icon: "🤝" },
] as const;

export function AccountProgress({
  hasSummary,
  hasPlaybook,
  hasContacts,
  hasSequence,
  hasInteraction,
  className,
}: AccountProgressProps) {
  const completion = {
    summary: hasSummary,
    playbook: hasPlaybook,
    contacts: hasContacts,
    sequence: hasSequence,
    interaction: hasInteraction,
  };

  const completedCount = Object.values(completion).filter(Boolean).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  // Find the next action to take
  const nextStep = steps.find((step) => !completion[step.key]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400">Account readiness</span>
            <span className="text-xs font-semibold text-emerald-400">{percentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const isComplete = completion[step.key];
          const isNext = nextStep?.key === step.key;
          return (
            <div
              key={step.key}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-lg transition-all duration-200",
                isComplete
                  ? "bg-emerald-500/10"
                  : isNext
                    ? "bg-amber-500/10 animate-pulse"
                    : "bg-slate-800/30",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isComplete
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isNext
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-700/50 text-slate-500",
                )}
              >
                {isComplete ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-[10px]">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium text-center leading-tight",
                  isComplete ? "text-emerald-400" : isNext ? "text-amber-400" : "text-slate-500",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Next action prompt */}
      {nextStep && percentage < 100 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <span className="text-amber-400">→</span>
          <span className="text-xs text-amber-200">
            Next: {nextStep.label === "Analysis" && "Run analysis to understand this account"}
            {nextStep.label === "Playbook" && "Generate a playbook for targeted outreach"}
            {nextStep.label === "Contacts" && "Add decision-makers to reach out to"}
            {nextStep.label === "Sequence" && "Create an outreach sequence"}
            {nextStep.label === "Outreach" && "Execute your first outreach"}
          </span>
        </div>
      )}

      {/* Completion message */}
      {percentage === 100 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <span className="text-emerald-400">✓</span>
          <span className="text-xs text-emerald-200">Account fully set up and active!</span>
        </div>
      )}
    </div>
  );
}
