import { authOptions } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe/stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro"]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { plan } = checkoutSchema.parse(body);

    const stripe = getStripeClient();
    if (!stripe) {
      const mockUrl = `/billing?status=mock&plan=${plan}`;
      return NextResponse.json({ url: mockUrl });
    }

    const priceId =
      plan === "starter"
        ? process.env.STRIPE_STARTER_PRICE_ID
        : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
    }

    const sessionCheckout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/billing?status=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?status=cancelled`,
      customer_email: session.user.email ?? undefined,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    return NextResponse.json({ url: sessionCheckout.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Failed to create checkout session", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
