import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

// Map Stripe price IDs to plan names
function getPlanFromPriceId(priceId: string | null): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return null;
}

// Helper to find user by Stripe customer ID
async function findUserByStripeCustomer(customerId: string) {
  return prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === "whsec_placeholder") {
    console.warn("Stripe webhook received but webhook secret/client not configured");
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("Stripe webhook rejected: missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string | null;

        if (plan && userId) {
          // Update plan and store Stripe customer ID for future subscription events
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan,
              stripeCustomerId: customerId || undefined,
            },
          });
          console.log(`[stripe webhook] Updated user ${userId} to plan ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id || null;
        const status = subscription.status;

        const user = await findUserByStripeCustomer(customerId);
        if (!user) {
          console.warn(`[stripe webhook] No user found for customer ${customerId}`);
          break;
        }

        // Handle subscription status changes
        if (status === "active" || status === "trialing") {
          const plan = getPlanFromPriceId(priceId);
          if (plan) {
            await prisma.user.update({
              where: { id: user.id },
              data: { plan },
            });
            console.log(`[stripe webhook] Updated user ${user.id} to plan ${plan} (subscription updated)`);
          }
        } else if (status === "past_due" || status === "unpaid") {
          // Keep current plan but log warning - may want to restrict features
          console.warn(`[stripe webhook] User ${user.id} subscription is ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await findUserByStripeCustomer(customerId);
        if (!user) {
          console.warn(`[stripe webhook] No user found for customer ${customerId}`);
          break;
        }

        // Downgrade to free plan when subscription is cancelled
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "free" },
        });
        console.log(`[stripe webhook] Downgraded user ${user.id} to free plan (subscription deleted)`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const user = await findUserByStripeCustomer(customerId);
        if (user) {
          console.warn(`[stripe webhook] Payment failed for user ${user.id}`);
          // Could implement grace period logic here
        }
        break;
      }

      default:
        // Unhandled event type - log but don't error
        console.log(`[stripe webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
