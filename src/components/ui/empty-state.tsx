import { PrimaryButton, SecondaryButton } from "./buttons";

export function EmptyState({
  icon = "✨",
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon?: string;
  title: string;
  description?: string;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-[#232527] bg-[#111214] p-8 text-center text-slate-200 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description ? <p className="text-sm text-slate-300">{description}</p> : null}
      <div className="flex flex-wrap justify-center gap-2">
        {primaryAction ? (
          primaryAction.href ? (
            <a href={primaryAction.href} className="inline-block">
              <PrimaryButton onClick={primaryAction.onClick}>{primaryAction.label}</PrimaryButton>
            </a>
          ) : (
            <PrimaryButton onClick={primaryAction.onClick}>{primaryAction.label}</PrimaryButton>
          )
        ) : null}
        {secondaryAction ? (
          secondaryAction.href ? (
            <a href={secondaryAction.href} className="inline-block">
              <SecondaryButton onClick={secondaryAction.onClick}>{secondaryAction.label}</SecondaryButton>
            </a>
          ) : (
            <SecondaryButton onClick={secondaryAction.onClick}>{secondaryAction.label}</SecondaryButton>
          )
        ) : null}
      </div>
    </div>
  );
}
