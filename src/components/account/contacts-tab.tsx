"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SecondaryButton } from "@/components/ui/buttons";
import { ContactForm } from "@/components/projects/contact-form";
import { OutreachForm } from "@/components/projects/outreach-form";
import { QuickFollowup } from "@/components/projects/quick-followup";
import { formatDate } from "@/lib/utils";
import { cn } from "@/components/ui/utils";

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

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  telegram: string | null;
  channelPreference: string | null;
  outreach: { id: string; channel: string; content: string; createdAt: Date }[];
  interactions: { id: string; title: string | null; body: string | null; channel: string; occurredAt: Date }[];
};

type OpportunityOutreach = { id: string; channel: string; content: string; createdAt: Date };

export function ContactsTab({
  projectId,
  projectName,
  contacts,
  templates,
  outreachLog,
}: {
  projectId: string;
  projectName: string;
  contacts: Contact[];
  templates: { id: string; title: string; content: string }[];
  outreachLog: OpportunityOutreach[];
}) {
  const [selected, setSelected] = useState<string | null>(contacts[0]?.id ?? null);
  const selectedContact = useMemo(() => {
    if (selected === null) return null;
    return contacts.find((c) => c.id === selected) ?? contacts[0] ?? null;
  }, [contacts, selected]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 space-y-4 lg:col-span-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Contacts</p>
          <SecondaryButton type="button" onClick={() => setSelected(null)} className="px-3 py-1 text-xs">
            Add contact
          </SecondaryButton>
        </div>
        {contacts.length === 0 ? (
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
              Add one to start outreach
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const channels = [
                contact.email && { Icon: EmailIcon, color: "bg-rose-500/20 text-rose-400" },
                contact.linkedinUrl && { Icon: LinkedInIcon, color: "bg-blue-500/20 text-blue-400" },
                contact.twitterHandle && { Icon: TwitterIcon, color: "bg-slate-500/20 text-slate-300" },
                contact.telegram && { Icon: TelegramIcon, color: "bg-sky-500/20 text-sky-400" },
              ].filter(Boolean) as Array<{ Icon: () => JSX.Element; color: string }>;

              return (
                <button
                  key={contact.id}
                  onClick={() => setSelected(contact.id)}
                  className={cn(
                    "group w-full rounded-xl border p-4 text-left backdrop-blur-sm transition-all duration-200",
                    isSelected
                      ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                      : "border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:border-white/20 hover:from-white/[0.09] hover:to-white/[0.05] hover:shadow-md"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-transform duration-200 group-hover:scale-105",
                        isSelected
                          ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30"
                          : `bg-gradient-to-br ${getAvatarGradient(contact.name)} text-white shadow-black/20`
                      )}
                    >
                      {getInitials(contact.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white tracking-tight">{contact.name}</p>
                        {contact.channelPreference && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-400">
                            Prefers {contact.channelPreference}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{contact.role || "—"}</p>

                      {/* Channel icons */}
                      {channels.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          {channels.map((ch, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-md",
                                ch.color
                              )}
                            >
                              <ch.Icon />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <Card className="p-4">
          <ContactForm projectId={projectId} />
        </Card>
      </div>

      <div className="col-span-12 space-y-4 lg:col-span-8">
        {selectedContact ? (
          <Card className="space-y-4">
            {/* Contact header */}
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(selectedContact.name)} text-lg font-bold text-white shadow-lg`}
              >
                {getInitials(selectedContact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-white tracking-tight">{selectedContact.name}</h3>
                <p className="text-sm text-slate-400">{selectedContact.role || "No role specified"}</p>
                {selectedContact.channelPreference && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs">
                    <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-emerald-400 font-medium">Prefers {selectedContact.channelPreference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact channels */}
            <div className="grid grid-cols-2 gap-2">
              {selectedContact.email && (
                <a
                  href={`mailto:${selectedContact.email}`}
                  className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs transition-colors hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/20 text-rose-400">
                    <EmailIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Email</p>
                    <p className="truncate text-slate-300">{selectedContact.email}</p>
                  </div>
                </a>
              )}
              {selectedContact.linkedinUrl && (
                <a
                  href={selectedContact.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs transition-colors hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
                    <LinkedInIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">LinkedIn</p>
                    <p className="truncate text-slate-300">{selectedContact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</p>
                  </div>
                </a>
              )}
              {selectedContact.twitterHandle && (
                <a
                  href={`https://twitter.com/${selectedContact.twitterHandle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs transition-colors hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-500/20 text-slate-300">
                    <TwitterIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Twitter/X</p>
                    <p className="truncate text-slate-300">@{selectedContact.twitterHandle.replace("@", "")}</p>
                  </div>
                </a>
              )}
              {selectedContact.telegram && (
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-800/50 px-3 py-2 text-xs">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                    <TelegramIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase text-slate-500">Telegram</p>
                    <p className="truncate text-slate-300">{selectedContact.telegram}</p>
                  </div>
                </div>
              )}
            </div>

            <OutreachForm
              projectId={projectId}
              contactId={selectedContact.id}
              contactName={selectedContact.name}
              projectName={projectName}
              templates={templates}
            />
            <QuickFollowup projectId={projectId} contactId={selectedContact.id} />

            <div className="space-y-3 rounded-lg border border-slate-800 bg-[#111214] p-3 text-xs text-slate-200">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Recent outreach</p>
              {selectedContact.outreach.length === 0 ? (
                <p className="text-slate-500">No outreach yet.</p>
              ) : (
                selectedContact.outreach.map((message) => (
                  <div key={message.id} className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[11px]">
                        {message.channel}
                      </Badge>
                      <span className="text-[10px] text-slate-500">{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-100">{message.content}</p>
                  </div>
                ))
              )}
            </div>

            {selectedContact.interactions.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-slate-800 bg-[#111214] p-3 text-xs text-slate-200">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Recent interactions</p>
                {selectedContact.interactions.map((i) => (
                  <div key={i.id} className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-100">{i.title || i.channel}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(i.occurredAt)}</p>
                    </div>
                    {i.body ? <p className="text-slate-200">{i.body}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : (
          <Card className="p-6 text-sm text-slate-300">Select a contact to view outreach.</Card>
        )}

        <Card className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">Outreach log</p>
            <p className="text-xs text-slate-500">{outreachLog.length} messages</p>
          </div>
          <div className="space-y-2 text-xs">
            {outreachLog.length === 0 ? <p className="text-slate-500">No outreach messages yet.</p> : null}
            {outreachLog.map((message) => (
              <div key={message.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px]">
                    {message.channel}
                  </Badge>
                  <p className="text-[11px] text-slate-500">{formatDate(message.createdAt)}</p>
                </div>
                <p className="mt-1 text-slate-200 line-clamp-3">{message.content}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
