import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Stripe publishable key not found');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// Firebase Functions for server-side Stripe operations
const functions = getFunctions();

export interface CreatePaymentIntentRequest {
  amount: number; // in cents
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export async function createPaymentIntent(
  request: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentResponse> {
  const createIntent = httpsCallable<CreatePaymentIntentRequest, CreatePaymentIntentResponse>(
    functions,
    'createPaymentIntent'
  );
  const result = await createIntent(request);
  return result.data;
}

export interface ProcessRefundRequest {
  paymentIntentId: string;
  amount?: number; // in cents, omit for full refund
  reason?: string;
}

export interface ProcessRefundResponse {
  refundId: string;
  status: string;
  amount: number;
}

export async function processStripeRefund(
  request: ProcessRefundRequest
): Promise<ProcessRefundResponse> {
  const refund = httpsCallable<ProcessRefundRequest, ProcessRefundResponse>(
    functions,
    'processRefund'
  );
  const result = await refund(request);
  return result.data;
}

export interface SendReceiptRequest {
  email: string;
  receiptNumber: string;
  transactionId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  payments: Array<{
    method: string;
    amount: number;
    cardLast4?: string;
  }>;
  businessName?: string;
  date: string;
}

export interface SendReceiptResponse {
  success: boolean;
  messageId?: string;
}

export async function sendReceipt(
  request: SendReceiptRequest
): Promise<SendReceiptResponse> {
  const send = httpsCallable<SendReceiptRequest, SendReceiptResponse>(
    functions,
    'sendReceiptEmail'
  );
  const result = await send(request);
  return result.data;
}

// Helper to convert dollars to cents for Stripe
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// Helper to convert cents to dollars for display
export function centsToDollars(cents: number): number {
  return cents / 100;
}
