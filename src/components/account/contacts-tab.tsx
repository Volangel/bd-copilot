"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SecondaryButton } from "@/components/ui/buttons";
import { ContactForm } from "@/components/projects/contact-form";
import { OutreachForm } from "@/components/projects/outreach-form";
import { QuickFollowup } from "@/components/projects/quick-followup";
import { formatDate } from "@/lib/utils";

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
          <Card className="p-4">
            <p className="text-sm text-slate-300">No contacts yet. Add one to start outreach.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelected(contact.id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition-all duration-150 ease-out ${
                  selectedContact?.id === contact.id ? "border-[#6366F1] bg-[#1E2022]" : "border-[#232527] bg-[#181A1C] hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{contact.name}</p>
                    <p className="text-xs text-slate-400">{contact.role || "—"}</p>
                  </div>
                  {contact.channelPreference ? <Badge variant="outline">Prefers {contact.channelPreference}</Badge> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  {contact.email ? <span>Email</span> : null}
                  {contact.linkedinUrl ? <span>LinkedIn</span> : null}
                  {contact.twitterHandle ? <span>Twitter</span> : null}
                  {contact.telegram ? <span>Telegram</span> : null}
                </div>
              </button>
            ))}
          </div>
        )}
        <Card className="p-4">
          <ContactForm projectId={projectId} />
        </Card>
      </div>

      <div className="col-span-12 space-y-4 lg:col-span-8">
        {selectedContact ? (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{selectedContact.name}</p>
                <p className="text-xs text-slate-400">{selectedContact.role}</p>
                {selectedContact.channelPreference ? (
                  <p className="text-[11px] text-emerald-300">Prefers {selectedContact.channelPreference}</p>
                ) : null}
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                {selectedContact.email ? <p>{selectedContact.email}</p> : null}
                {selectedContact.linkedinUrl ? <p>{selectedContact.linkedinUrl}</p> : null}
                {selectedContact.twitterHandle ? <p>@{selectedContact.twitterHandle}</p> : null}
                {selectedContact.telegram ? <p>{selectedContact.telegram}</p> : null}
              </div>
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
