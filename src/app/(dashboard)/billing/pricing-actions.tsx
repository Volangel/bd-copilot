"use client";

import { useState } from "react";

const tiers = [
  {
    name: "Starter",
    plan: "starter",
    price: "$29/mo",
    features: ["Unlimited projects", "ICP scoring", "Mock outreach"],
  },
  {
    name: "Pro",
    plan: "pro",
    price: "$79/mo",
    features: ["Custom voice", "Multi-channel outreach", "Follow-up scheduler"],
  },
];

export default function BillingActions({ currentPlan }: { currentPlan: string }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const startCheckout = async (plan: string) => {
    setLoadingPlan(plan);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json().catch(() => ({}));
    setLoadingPlan(null);
    if (data.url) {
      window.location.assign(data.url);
    }
  };

  return (
    <>
      {tiers.map((tier) => (
        <div key={tier.plan} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-white">{tier.name}</p>
              <p className="text-sm text-slate-400">{tier.price}</p>
            </div>
            <button
              onClick={() => startCheckout(tier.plan)}
              disabled={currentPlan === tier.plan || !!loadingPlan}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {loadingPlan === tier.plan ? "Redirecting..." : currentPlan === tier.plan ? "Current" : "Upgrade"}
            </button>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            {tier.features.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
