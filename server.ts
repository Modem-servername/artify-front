
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const app = express();

// Stripe prices from environment
const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

// 1. Create Checkout Session
app.post('/api/billing/create-checkout', express.json(), async (req, res) => {
  const { planId, userId, customerEmail } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[planId], quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      customer_email: customerEmail,
      metadata: { userId, planId },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Stripe Webhook Handler
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // UPDATE DATABASE: Set user plan, limits, and stripe IDs
      // await db.users.update({
      //   where: { id: session.metadata.userId },
      //   data: { 
      //     plan_id: session.metadata.planId,
      //     request_limit: session.metadata.planId === 'pro' ? 5000000 : 100000000,
      //     stripe_customer_id: session.customer,
      //     stripe_subscription_id: session.subscription,
      //     subscription_status: 'active'
      //   }
      // });
      break;

    case 'invoice.paid':
      // Update billing period dates based on invoice period
      break;

    case 'customer.subscription.deleted':
      // Revert user to free plan
      break;
  }

  res.json({ received: true });
});

app.listen(3000, () => console.log('Nexus Billing Server running on port 3000'));
