"use client";

import { useState } from "react";
import { cn } from "@/components/ui/utils";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string;
  role?: string | null;
  persona?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  telegram?: string | null;
  channelPreference?: string | null;
  sequence?: {
    steps: Array<{ status: string }>;
  } | null;
}

interface ContactCardProps {
  contact: Contact;
  isSelected?: boolean;
  onSelect?: (contactId: string) => void;
  onPersonaChange?: (contactId: string, persona: string) => void;
  compact?: boolean;
  className?: string;
}

export function ContactCard({
  contact,
  isSelected,
  onSelect,
  onPersonaChange,
  compact = false,
  className,
}: ContactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const pendingSteps = contact.sequence?.steps.filter((s) => s.status === "PENDING").length || 0;
  const completedSteps = contact.sequence?.steps.filter((s) => s.status === "SENT").length || 0;
  const totalSteps = contact.sequence?.steps.length || 0;

  const channels = [
    contact.email && { type: "email", value: contact.email, icon: "✉️" },
    contact.linkedinUrl && { type: "linkedin", value: contact.linkedinUrl, icon: "🔗" },
    contact.twitterHandle && { type: "twitter", value: contact.twitterHandle, icon: "𝕏" },
    contact.telegram && { type: "telegram", value: contact.telegram, icon: "✈️" },
  ].filter(Boolean) as Array<{ type: string; value: string; icon: string }>;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const personaColors: Record<string, string> = {
    "Technical founder": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "Protocol engineer": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "BD / ecosystem lead": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Security lead": "bg-red-500/20 text-red-400 border-red-500/30",
    "Marketing/Growth": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all duration-200",
        isSelected
          ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]",
        onSelect && "cursor-pointer",
        className,
      )}
      onClick={() => onSelect?.(contact.id)}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-300",
            )}
          >
            {getInitials(contact.name)}
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-semibold text-white">{contact.name}</h4>
              {pendingSteps > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  {pendingSteps} pending
                </span>
              )}
            </div>
            {contact.role && <p className="truncate text-xs text-slate-400">{contact.role}</p>}

            {/* Compact channel icons */}
            {!compact && channels.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                {channels.map((ch) => (
                  <a
                    key={ch.type}
                    href={ch.type === "email" ? `mailto:${ch.value}` : ch.value}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[10px] hover:bg-slate-700 transition-colors"
                    title={ch.value}
                  >
                    {ch.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Right side badges/status */}
          <div className="flex flex-col items-end gap-1">
            {contact.persona && (
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                  personaColors[contact.persona] || "bg-slate-700 text-slate-300 border-slate-600",
                )}
              >
                {contact.persona.split(" ")[0]}
              </span>
            )}
            {totalSteps > 0 && (
              <div className="flex items-center gap-1">
                <div className="h-1 w-12 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">
                  {completedSteps}/{totalSteps}
                </span>
              </div>
            )}
          </div>

          {/* Expand button */}
          {!compact && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg
                className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && !compact && (
          <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
            {/* Contact details */}
            <div className="grid gap-2 text-xs">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Email:</span>
                  <a href={`mailto:${contact.email}`} className="text-emerald-400 hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">LinkedIn:</span>
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-emerald-400 hover:underline"
                  >
                    {contact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}
                  </a>
                </div>
              )}
              {contact.twitterHandle && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Twitter:</span>
                  <a
                    href={
                      contact.twitterHandle.startsWith("http")
                        ? contact.twitterHandle
                        : `https://twitter.com/${contact.twitterHandle.replace("@", "")}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    {contact.twitterHandle}
                  </a>
                </div>
              )}
              {contact.telegram && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Telegram:</span>
                  <span className="text-slate-300">{contact.telegram}</span>
                </div>
              )}
            </div>

            {/* Persona selector */}
            {onPersonaChange && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500">Persona</label>
                <select
                  value={contact.persona || ""}
                  onChange={(e) => onPersonaChange(contact.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                >
                  <option value="">Select persona...</option>
                  <option value="Technical founder">Technical founder</option>
                  <option value="Protocol engineer">Protocol engineer</option>
                  <option value="BD / ecosystem lead">BD / ecosystem lead</option>
                  <option value="Security lead">Security lead</option>
                  <option value="Marketing/Growth">Marketing/Growth</option>
                </select>
              </div>
            )}

            {/* Channel preference */}
            {contact.channelPreference && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Prefers:</span>
                <Badge variant="outline" className="text-[10px]">
                  {contact.channelPreference}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Compact list view for multiple contacts
export function ContactList({
  contacts,
  selectedContactId,
  onSelectContact,
  onPersonaChange,
  className,
}: {
  contacts: Contact[];
  selectedContactId?: string | null;
  onSelectContact?: (contactId: string) => void;
  onPersonaChange?: (contactId: string, persona: string) => void;
  className?: string;
}) {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          isSelected={selectedContactId === contact.id}
          onSelect={onSelectContact}
          onPersonaChange={onPersonaChange}
        />
      ))}
    </div>
  );
}
