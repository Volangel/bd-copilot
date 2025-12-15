"use client";

import React, { useState } from "react";
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

// SVG Icons for social channels
const EmailIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 6L12 13L2 6" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Persona icons
const PersonaIcon = ({ persona }: { persona: string }) => {
  switch (persona) {
    case "Technical founder":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "Protocol engineer":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "BD / ecosystem lead":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "Security lead":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "Marketing/Growth":
      return (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 6l-9.5 9.5-5-5L1 18" />
          <path d="M17 6h6v6" />
        </svg>
      );
    default:
      return null;
  }
};

// Generate gradient based on name
const getAvatarGradient = (name: string): string => {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-rose-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
    "from-amber-500 to-orange-500",
    "from-teal-500 to-emerald-500",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

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
    contact.email && { type: "email", value: contact.email, Icon: EmailIcon, color: "hover:bg-rose-500/20 hover:text-rose-400" },
    contact.linkedinUrl && { type: "linkedin", value: contact.linkedinUrl, Icon: LinkedInIcon, color: "hover:bg-blue-500/20 hover:text-blue-400" },
    contact.twitterHandle && { type: "twitter", value: contact.twitterHandle, Icon: TwitterIcon, color: "hover:bg-slate-100/20 hover:text-white" },
    contact.telegram && { type: "telegram", value: contact.telegram, Icon: TelegramIcon, color: "hover:bg-sky-500/20 hover:text-sky-400" },
  ].filter(Boolean) as Array<{ type: string; value: string; Icon: () => React.JSX.Element; color: string }>;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const personaColors: Record<string, string> = {
    "Technical founder": "bg-purple-500/20 text-purple-300 border-purple-500/40",
    "Protocol engineer": "bg-blue-500/20 text-blue-300 border-blue-500/40",
    "BD / ecosystem lead": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    "Security lead": "bg-red-500/20 text-red-300 border-red-500/40",
    "Marketing/Growth": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border backdrop-blur-sm transition-all duration-200",
        isSelected
          ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
          : "border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:border-white/20 hover:from-white/[0.09] hover:to-white/[0.05] hover:shadow-md hover:shadow-black/20",
        onSelect && "cursor-pointer",
        className,
      )}
      onClick={() => onSelect?.(contact.id)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar with gradient */}
          <div className="relative">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-transform duration-200 group-hover:scale-105",
                isSelected
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30"
                  : `bg-gradient-to-br ${getAvatarGradient(contact.name)} text-white shadow-black/20`,
              )}
            >
              {getInitials(contact.name)}
            </div>
            {/* Online/active indicator */}
            {channels.length > 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
            )}
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-semibold text-white tracking-tight">{contact.name}</h4>
              {pendingSteps > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {pendingSteps} pending
                </span>
              )}
            </div>
            {contact.role && (
              <p className="truncate text-xs text-slate-400 mt-0.5">{contact.role}</p>
            )}

            {/* Channel icons with brand colors */}
            {!compact && channels.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5">
                {channels.map((ch) => (
                  <a
                    key={ch.type}
                    href={ch.type === "email" ? `mailto:${ch.value}` : ch.value}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 transition-all duration-150",
                      ch.color,
                      "hover:scale-110 hover:shadow-lg"
                    )}
                    title={ch.value}
                  >
                    <ch.Icon />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Right side badges/status */}
          <div className="flex flex-col items-end gap-2">
            {contact.persona && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold tracking-wide",
                  personaColors[contact.persona] || "bg-slate-700/50 text-slate-300 border-slate-600",
                )}
              >
                <PersonaIcon persona={contact.persona} />
                {contact.persona.split(" ")[0]}
              </span>
            )}
            {totalSteps > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-14 rounded-full bg-slate-700/80 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500">
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
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white transition-all duration-150"
            >
              <svg
                className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")}
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
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            {/* Contact details grid */}
            <div className="grid grid-cols-2 gap-3">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs transition-colors hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/20 text-rose-400">
                    <EmailIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Email</p>
                    <p className="truncate text-slate-300">{contact.email}</p>
                  </div>
                </a>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs transition-colors hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
                    <LinkedInIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">LinkedIn</p>
                    <p className="truncate text-slate-300">
                      {contact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}
                    </p>
                  </div>
                </a>
              )}
              {contact.twitterHandle && (
                <a
                  href={
                    contact.twitterHandle.startsWith("http")
                      ? contact.twitterHandle
                      : `https://twitter.com/${contact.twitterHandle.replace("@", "")}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs transition-colors hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-500/20 text-slate-300">
                    <TwitterIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Twitter/X</p>
                    <p className="truncate text-slate-300">{contact.twitterHandle}</p>
                  </div>
                </a>
              )}
              {contact.telegram && (
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                    <TelegramIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Telegram</p>
                    <p className="truncate text-slate-300">{contact.telegram}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Persona selector */}
            {onPersonaChange && (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Persona
                </label>
                <select
                  value={contact.persona || ""}
                  onChange={(e) => onPersonaChange(contact.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-2 text-xs text-white shadow-inner transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
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
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs">
                <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-slate-400">Prefers</span>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-400">
                  {contact.channelPreference}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyContactState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800">
        <svg className="h-7 w-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <h4 className="text-sm font-semibold text-slate-300">No contacts yet</h4>
      <p className="mt-1 max-w-xs text-xs text-slate-500">
        Add contacts to start tracking your outreach and building relationships
      </p>
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
  showEmptyState = true,
}: {
  contacts: Contact[];
  selectedContactId?: string | null;
  onSelectContact?: (contactId: string) => void;
  onPersonaChange?: (contactId: string, persona: string) => void;
  className?: string;
  showEmptyState?: boolean;
}) {
  if (contacts.length === 0) {
    return showEmptyState ? <EmptyContactState /> : null;
  }

  return (
    <div className={cn("space-y-3", className)}>
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
