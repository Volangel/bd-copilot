import Stripe from "stripe";

export function getStripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret === "sk_test_placeholder") {
    return null;
  }

  return new Stripe(secret, {
    apiVersion: "2024-11-20",
  });
}
