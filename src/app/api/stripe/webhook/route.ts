import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripeClient();

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === "whsec_placeholder") {
    console.warn("Stripe webhook received but webhook secret/client not configured");
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  const signature = headers().get("stripe-signature");
  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature || "", process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = session.metadata?.plan;
      const userId = session.metadata?.userId;
      if (plan && userId) {
        await prisma.user.update({ where: { id: userId }, data: { plan } });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
