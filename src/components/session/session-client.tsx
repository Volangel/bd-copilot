"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/ui/toast";

const CHANNELS = ["linkedin", "twitter", "telegram", "email"] as const;

type Channel = (typeof CHANNELS)[number];

type SessionProject = { id: string; nextFollowUpAt?: string | null };
type SessionContact = {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  telegram?: string | null;
};

type Props = {
  project: SessionProject;
  contact: SessionContact;
};

type OutreachMessage = { channel: string; content: string };

const DEFAULT_FOLLOW_MS = 3 * 24 * 60 * 60 * 1000;
const computeNextFollow = () => new Date(Date.now() + DEFAULT_FOLLOW_MS).toISOString();

export default function SessionClient({ project, contact }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Channel[]>(["email", "linkedin"]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const toggleChannel = (channel: Channel) => {
    setSelected((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/outreach/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, contactId: contact.id, channels: selected }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to generate outreach");
      setLoading(false);
      return;
    }
    const map: Record<string, string> = {};
    (data as OutreachMessage[]).forEach((msg) => {
      map[msg.channel] = msg.content;
    });
    setMessages(map);
    setInfo("Messages generated. Copy to send and schedule follow-ups.");
    setHistory((prev) => [`Generated ${Object.keys(map).length} message(s)`, ...prev].slice(0, 3));
    setLoading(false);
  };

  const copyMessage = async (channel: string, content: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(content);
      const nextFollow = project.nextFollowUpAt || computeNextFollow();
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastContactAt: new Date().toISOString(), nextFollowUpAt: nextFollow }),
      });
      setInfo(`Copied ${channel} message and scheduled follow-up.`);
      setHistory((prev) => [`Sent via ${channel}`, ...prev].slice(0, 3));
    } catch (err) {
      console.error("Copy failed", err);
      setError("Failed to copy or update follow-up");
    }
  };

  const mutateFollowUp = async (days: number) => {
    setError(null);
    try {
      const nextDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUpAt: nextDate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update follow-up");
      }
      router.refresh();
      setHistory((prev) => [`Scheduled next touch in ${days} day(s)`, ...prev].slice(0, 3));
    } catch (err) {
      console.error("Failed to update follow-up", err);
      setError("Failed to update follow-up timing");
    }
  };

  const skip = () => mutateFollowUp(1);
  const next = () => mutateFollowUp(3);

  return (
    <div className="space-y-4">
      <Toast message={info} onClear={() => setInfo(null)} />
      <Toast message={error} type="error" onClear={() => setError(null)} />
      <div>
        <p className="text-xs uppercase text-slate-400">Channels</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {CHANNELS.map((c) => {
            const active = selected.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleChannel(c)}
                className={`rounded-full px-3 py-1 ${active ? "bg-emerald-500 text-slate-950" : "border border-slate-700 bg-slate-950 text-slate-200"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <button
        onClick={generate}
        disabled={loading || selected.length === 0}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {loading ? "Generating..." : "Generate outreach"}
      </button>

      <div className="space-y-2">
        {Object.entries(messages).map(([channel, content]) => (
          <div key={channel} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-semibold uppercase text-xs text-slate-400">{channel}</p>
              <button
                onClick={() => copyMessage(channel, content)}
                className="rounded border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-slate-100">{content}</p>
          </div>
        ))}
        {Object.keys(messages).length === 0 ? <p className="text-xs text-slate-500">Generate to see messages.</p> : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={skip}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          Skip
        </button>
        <button
          onClick={next}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Next contact
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
        <p className="font-semibold text-white">Recent session actions</p>
        <ul className="mt-2 space-y-1">
          {history.length === 0 ? <li className="text-slate-500">No actions yet.</li> : null}
          {history.map((h, idx) => (
            <li key={idx}>• {h}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
