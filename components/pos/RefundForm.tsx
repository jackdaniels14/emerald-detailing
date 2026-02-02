'use client';

import { useState } from 'react';
import { POSTransaction, TransactionPayment, Refund } from '@/lib/types';
import { processStripeRefund, dollarsToCents } from '@/lib/stripe';
import { createRefund, updateTransaction } from '@/lib/db';

interface RefundFormProps {
  transaction: POSTransaction;
  onRefundComplete: (refund: Partial<Refund>) => void;
  onCancel: () => void;
  processedBy: string;
}

export default function RefundForm({
  transaction,
  onRefundComplete,
  onCancel,
  processedBy,
}: RefundFormProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(
    transaction.payments.length === 1 ? transaction.payments[0].id : null
  );
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligiblePayments = transaction.payments.filter(
    p => p.status === 'completed' && (p.refundedAmount || 0) < p.amount
  );

  const selectedPaymentData = eligiblePayments.find(p => p.id === selectedPayment);
  const maxRefundAmount = selectedPaymentData
    ? selectedPaymentData.amount - (selectedPaymentData.refundedAmount || 0)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPayment || !selectedPaymentData) {
      setError('Please select a payment to refund');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    const amount = refundType === 'full'
      ? maxRefundAmount
      : parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (amount > maxRefundAmount) {
      setError(`Refund amount cannot exceed $${maxRefundAmount.toFixed(2)}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let stripeRefundId: string | undefined;

      // Process Stripe refund if card payment
      if (selectedPaymentData.method === 'card' && selectedPaymentData.stripePaymentIntentId) {
        const stripeResult = await processStripeRefund({
          paymentIntentId: selectedPaymentData.stripePaymentIntentId,
          amount: refundType === 'partial' ? dollarsToCents(amount) : undefined,
          reason: 'requested_by_customer',
        });
        stripeRefundId = stripeResult.refundId;
      }

      // Create refund record
      const refundData: Omit<Refund, 'id' | 'createdAt'> = {
        transactionId: transaction.id,
        paymentId: selectedPayment,
        amount,
        reason: reason.trim(),
        type: refundType,
        stripeRefundId,
        processedBy,
        status: 'completed',
      };

      const refundId = await createRefund(refundData);

      // Update payment with refunded amount
      const newRefundedAmount = (selectedPaymentData.refundedAmount || 0) + amount;
      const updatedPayments = transaction.payments.map(p =>
        p.id === selectedPayment
          ? {
              ...p,
              refundedAmount: newRefundedAmount,
              status: newRefundedAmount >= p.amount ? 'refunded' as const : p.status,
            }
          : p
      );

      // Calculate new transaction status
      const totalRefunded = updatedPayments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0);
      const transactionTotal = transaction.total;
      const newStatus = totalRefunded >= transactionTotal
        ? 'fully_refunded'
        : totalRefunded > 0
          ? 'partially_refunded'
          : transaction.status;

      // Update transaction
      await updateTransaction(transaction.id, {
        payments: updatedPayments as TransactionPayment[],
        status: newStatus as POSTransaction['status'],
      });

      onRefundComplete({
        id: refundId,
        ...refundData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  if (eligiblePayments.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">No eligible payments to refund.</p>
        <button
          onClick={onCancel}
          className="mt-2 text-sm text-yellow-800 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm">
          <span className="font-medium">Receipt #:</span> {transaction.receiptNumber}
        </p>
        <p className="text-sm">
          <span className="font-medium">Total:</span> ${transaction.total.toFixed(2)}
        </p>
      </div>

      {/* Payment Selection */}
      {eligiblePayments.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Payment to Refund
          </label>
          <div className="space-y-2">
            {eligiblePayments.map((payment) => (
              <label
                key={payment.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPayment === payment.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={payment.id}
                  checked={selectedPayment === payment.id}
                  onChange={() => setSelectedPayment(payment.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium capitalize">
                    {payment.method}
                    {payment.cardLast4 && ` (**** ${payment.cardLast4})`}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${payment.amount.toFixed(2)}
                    {payment.refundedAmount && payment.refundedAmount > 0 && (
                      <span className="text-red-500 ml-2">
                        (${payment.refundedAmount.toFixed(2)} refunded)
                      </span>
                    )}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Refund Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Refund Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="refundType"
              value="full"
              checked={refundType === 'full'}
              onChange={() => setRefundType('full')}
              className="mr-2"
            />
            <span>Full Refund (${maxRefundAmount.toFixed(2)})</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="refundType"
              value="partial"
              checked={refundType === 'partial'}
              onChange={() => setRefundType('partial')}
              className="mr-2"
            />
            <span>Partial Refund</span>
          </label>
        </div>
      </div>

      {/* Partial Refund Amount */}
      {refundType === 'partial' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refund Amount (max: ${maxRefundAmount.toFixed(2)})
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-1">$</span>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              max={maxRefundAmount}
              min="0.01"
              step="0.01"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for Refund
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Enter reason for refund..."
          required
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isProcessing || !selectedPayment}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Process Refund'}
        </button>
      </div>
    </form>
  );
}
