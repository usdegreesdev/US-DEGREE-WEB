/** GET /billing/payments → { payments: Payment[] } */
export interface Payment {
  sessionId: string;
  packId: string;
  packName: string;
  credits: number;
  /** Minor units (cents for USD). */
  amountCents: number;
  /** ISO 4217 code, e.g. "usd". */
  currency: string;
  receiptUrl: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

/** GET /me/billing — everything the Plan & Billing popup shows. Amounts are minor units. */
export interface BillingDetails {
  currentPlan: {
    planId: string;
    name: string;
    status: "active" | "exhausted" | "expired" | "none";
    creditsTotal: number;
    creditsUsed: number;
    creditsRemaining: number;
    purchasedAt: string;
    expiresAt: string | null;
    features: string[];
  } | null;
  lastPayment: {
    amount: number;
    currency: string;
    paidAt: string;
    status: "paid" | "refunded" | "failed";
    cardBrand: string | null;
    cardLast4: string | null;
    receiptUrl: string | null;
    receiptEmail: string | null;
    reference: string;
  } | null;
  purchases: {
    id: string;
    date: string;
    planName: string;
    credits: number;
    amount: number;
    currency: string;
    status: string;
    receiptUrl: string | null;
  }[];
  creditUsage: { id: string; date: string; description: string; credits: number }[];
}

/** GET /billing/checkout-status?session_id=... */
export type CheckoutStatus =
  | {
      status: "paid";
      credits: number;
      amountCents: number;
      currency: string;
      receiptUrl: string | null;
      createdAt: string;
    }
  | { status: "processing" | "unpaid" | "unknown" };
