"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect, useRef } from "react";

export function NewProjectModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
      // Open on Cmd/Ctrl + N
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create project");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setUrl("");
    setName("");
    setIsOpen(false);
    if (data?.id) {
      router.push(`/projects/${data.id}`);
    } else {
      router.refresh();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setIsOpen(false);
      setError(null);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 hover:shadow-emerald-500/30"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Account
        <kbd className="ml-1 hidden rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-medium sm:inline">⌘N</kbd>
      </button>

      {/* Modal backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative w-full max-w-lg animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="rounded-2xl border border-white/10 bg-[#0F1012] shadow-2xl shadow-black/50">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Add New Account</h2>
                  <p className="text-sm text-slate-400">Paste a URL and we&apos;ll analyze it for ICP fit</p>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="p-6">
                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* URL input - Primary */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white" htmlFor="modal-project-url">
                      Website URL <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <input
                        ref={inputRef}
                        id="modal-project-url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] py-3 pl-11 pr-4 text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="https://example.xyz"
                        required
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-slate-500">We&apos;ll extract company info and calculate ICP score</p>
                  </div>

                  {/* Name input - Optional */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300" htmlFor="modal-project-name">
                      Display Name <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="modal-project-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-4 py-3 text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Company name or nickname"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 disabled:opacity-50"
                    disabled={loading || !url}
                  >
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
