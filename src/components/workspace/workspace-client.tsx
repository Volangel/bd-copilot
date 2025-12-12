"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/utils";
import { WorkspaceTabs } from "./workspace-tabs";
import { AccountProgress } from "./account-progress";
import { ContactCard, ContactList } from "./contact-card";
import { QuickActions } from "./quick-actions";
import { WorkspaceEmptyState, InlineEmptyState } from "./empty-state";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

// Icons
const ContextIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ContactsIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ActivityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const SequenceIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

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
    steps: Array<{
      id: string;
      status: string;
      stepNumber: number;
      channel: string;
      content: string;
      scheduledAt?: string | null;
    }>;
  } | null;
}

interface WorkspaceClientProps {
  projectId: string;
  projectName: string;
  projectUrl: string;
  hasSummary: boolean;
  hasPlaybook: boolean;
  contacts: Contact[];
  pendingStepsCount: number;
  interactionsCount: number;
  notesCount: number;
  children: {
    accountInfo: React.ReactNode;
    summary: React.ReactNode;
    playbook: React.ReactNode;
    nextAction: React.ReactNode;
    contactForm: React.ReactNode;
    aiContactFinder: React.ReactNode;
    sequenceBuilder: React.ReactNode;
    selectedContactSteps: React.ReactNode;
    outreachForm: React.ReactNode;
    interactionForm: React.ReactNode;
    noteForm: React.ReactNode;
    interactions: React.ReactNode;
    notes: React.ReactNode;
  };
}

export function WorkspaceClient({
  projectId,
  projectName,
  projectUrl,
  hasSummary,
  hasPlaybook,
  contacts,
  pendingStepsCount,
  interactionsCount,
  notesCount,
  children,
}: WorkspaceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("context");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    contacts[0]?.id || null,
  );
  const [showContactForm, setShowContactForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  // Sync with URL params
  useEffect(() => {
    const tab = searchParams.get("tab");
    const contactId = searchParams.get("contactId");
    if (tab) setActiveTab(tab);
    if (contactId) setSelectedContactId(contactId);
  }, [searchParams]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Memoize keyboard handler for proper cleanup
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Tab shortcuts (1, 2, 3)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === "1") {
        e.preventDefault();
        setActiveTab("context");
      } else if (e.key === "2") {
        e.preventDefault();
        setActiveTab("contacts");
      } else if (e.key === "3") {
        e.preventDefault();
        setActiveTab("activity");
      } else if (e.key === "n" && e.shiftKey) {
        e.preventDefault();
        setShowContactForm(true);
        setActiveTab("contacts");
      }
    }

    // Escape to close modals
    if (e.key === "Escape") {
      setShowContactForm(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("contactId", contactId);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handlePersonaChange = async (contactId: string, persona: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, persona }),
      });
      if (res.ok) {
        setToast({ message: "Persona updated", type: "success" });
        router.refresh();
      }
    } catch {
      setToast({ message: "Failed to update persona", type: "error" });
    }
  };

  const tabs = [
    {
      id: "context",
      label: "Context",
      icon: <ContextIcon />,
      badge: !hasSummary ? "!" : undefined,
      badgeVariant: "warning" as const,
    },
    {
      id: "contacts",
      label: "Contacts",
      icon: <ContactsIcon />,
      badge: contacts.length || undefined,
    },
    {
      id: "activity",
      label: "Activity",
      icon: <ActivityIcon />,
      badge: pendingStepsCount > 0 ? pendingStepsCount : undefined,
      badgeVariant: pendingStepsCount > 0 ? "warning" as const : undefined,
    },
  ];

  const quickActions = [
    {
      id: "add-contact",
      label: "Add Contact",
      shortcut: "Shift+N",
      icon: <ContactsIcon />,
      onClick: () => {
        setShowContactForm(true);
        setActiveTab("contacts");
      },
    },
    {
      id: "create-sequence",
      label: "New Sequence",
      shortcut: "Ctrl+S",
      icon: <SequenceIcon />,
      onClick: () => {
        setActiveTab("contacts");
        // Scroll to sequence builder
        document.getElementById("sequence-builder")?.scrollIntoView({ behavior: "smooth" });
      },
      disabled: contacts.length === 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Account Progress - Always visible */}
      <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/95 p-4 shadow-lg">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="truncate text-xl font-semibold text-white">{projectName}</h1>
              <a
                href={projectUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
              >
                {projectUrl} ↗
              </a>
            </div>
            <AccountProgress
              hasSummary={hasSummary}
              hasPlaybook={hasPlaybook}
              hasContacts={contacts.length > 0}
              hasSequence={contacts.some((c) => c.sequence?.steps?.length)}
              hasInteraction={interactionsCount > 0}
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <WorkspaceTabs tabs={tabs} defaultTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {/* Context Tab */}
        {activeTab === "context" && (
          <div className="grid grid-cols-12 gap-4">
            {/* Left column - Account Info & Summary */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <CollapsibleSection
                title="Account Details"
                storageKey={`${projectId}-details`}
                defaultOpen
                priority="medium"
              >
                {children.accountInfo}
              </CollapsibleSection>

              <CollapsibleSection
                title="Summary & Insights"
                subtitle="AI-generated analysis of this account"
                storageKey={`${projectId}-summary`}
                defaultOpen
                isEmpty={!hasSummary}
                emptyMessage="Run analysis to generate insights"
                priority={hasSummary ? "medium" : "high"}
              >
                {children.summary}
              </CollapsibleSection>

              <CollapsibleSection
                title="Account Playbook"
                subtitle="Tailored personas and angles"
                storageKey={`${projectId}-playbook`}
                defaultOpen={hasPlaybook}
                isEmpty={!hasPlaybook}
                emptyMessage="Generate a playbook for targeted outreach"
                priority={hasPlaybook ? "medium" : "high"}
              >
                {children.playbook}
              </CollapsibleSection>
            </div>

            {/* Right column - Next Action */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <CollapsibleSection
                title="Next Action"
                subtitle="Your next step for this account"
                storageKey={`${projectId}-next`}
                defaultOpen
                priority={pendingStepsCount > 0 ? "high" : "low"}
              >
                {children.nextAction}
              </CollapsibleSection>
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div className="grid grid-cols-12 gap-4">
            {/* Left column - Contact List */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <CollapsibleSection
                title="Contacts"
                badge={
                  <Badge variant="neutral" className="text-[10px]">
                    {contacts.length}
                  </Badge>
                }
                actions={
                  <button
                    onClick={() => setShowContactForm(!showContactForm)}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    {showContactForm ? "Cancel" : "+ Add"}
                  </button>
                }
                storageKey={`${projectId}-contacts`}
                defaultOpen
              >
                {showContactForm && (
                  <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <h4 className="text-sm font-medium text-white mb-3">Add New Contact</h4>
                    {children.contactForm}
                  </div>
                )}
                {contacts.length > 0 ? (
                  <ContactList
                    contacts={contacts}
                    selectedContactId={selectedContactId}
                    onSelectContact={handleContactSelect}
                    onPersonaChange={handlePersonaChange}
                  />
                ) : (
                  <WorkspaceEmptyState
                    type="contacts"
                    action={{
                      label: "Add First Contact",
                      onClick: () => setShowContactForm(true),
                    }}
                  />
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="AI Contact Finder"
                subtitle="Discover team members automatically"
                storageKey={`${projectId}-ai-finder`}
                defaultOpen={contacts.length === 0}
              >
                {children.aiContactFinder}
              </CollapsibleSection>
            </div>

            {/* Right column - Selected Contact Details & Sequence */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              {selectedContact ? (
                <>
                  <CollapsibleSection
                    title={`Sequence for ${selectedContact.name}`}
                    subtitle={
                      selectedContact.sequence?.steps.length
                        ? `${selectedContact.sequence.steps.filter((s) => s.status === "PENDING").length} pending steps`
                        : "No sequence yet"
                    }
                    storageKey={`${projectId}-sequence`}
                    defaultOpen
                    priority={
                      selectedContact.sequence?.steps.some((s) => s.status === "PENDING")
                        ? "high"
                        : "medium"
                    }
                  >
                    {selectedContact.sequence?.steps.length ? (
                      <div className="space-y-4">
                        {children.selectedContactSteps}
                        <div className="border-t border-white/10 pt-4">
                          {children.outreachForm}
                        </div>
                      </div>
                    ) : (
                      <WorkspaceEmptyState type="sequence" />
                    )}
                  </CollapsibleSection>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
                  <p className="text-sm text-slate-500">
                    Select a contact to view their sequence and outreach options
                  </p>
                </div>
              )}

              <CollapsibleSection
                title="Create Sequence"
                subtitle="Build a multi-touch outreach plan"
                storageKey={`${projectId}-builder`}
                defaultOpen={contacts.length > 0 && !contacts.some((c) => c.sequence)}
              >
                <div id="sequence-builder">{children.sequenceBuilder}</div>
              </CollapsibleSection>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="grid grid-cols-12 gap-4">
            {/* Left column - Log Forms */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <CollapsibleSection
                title="Log Interaction"
                subtitle="Record calls, emails, and meetings"
                storageKey={`${projectId}-log-interaction`}
                defaultOpen
              >
                {children.interactionForm}
              </CollapsibleSection>

              <CollapsibleSection
                title="Add Note"
                subtitle="Capture insights and context"
                storageKey={`${projectId}-add-note`}
                defaultOpen={false}
              >
                {children.noteForm}
              </CollapsibleSection>
            </div>

            {/* Right column - Activity Feed */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <CollapsibleSection
                title="Activity Timeline"
                badge={
                  <Badge variant="neutral" className="text-[10px]">
                    {interactionsCount}
                  </Badge>
                }
                storageKey={`${projectId}-activity`}
                defaultOpen
                isEmpty={interactionsCount === 0}
                emptyMessage="No activity recorded yet"
              >
                {children.interactions}
              </CollapsibleSection>

              <CollapsibleSection
                title="Notes"
                badge={
                  <Badge variant="neutral" className="text-[10px]">
                    {notesCount}
                  </Badge>
                }
                storageKey={`${projectId}-notes`}
                defaultOpen={notesCount > 0}
                isEmpty={notesCount === 0}
                emptyMessage="No notes yet"
              >
                {children.notes}
              </CollapsibleSection>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <QuickActions actions={quickActions} />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-6 right-6 hidden lg:block">
        <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-[10px] text-slate-500 backdrop-blur">
          <span className="font-medium text-slate-400">Shortcuts:</span>{" "}
          <kbd className="rounded bg-slate-800 px-1">1</kbd> Context{" "}
          <kbd className="rounded bg-slate-800 px-1">2</kbd> Contacts{" "}
          <kbd className="rounded bg-slate-800 px-1">3</kbd> Activity
        </div>
      </div>
    </div>
  );
}
