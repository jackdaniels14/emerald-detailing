'use client';

import { useState } from 'react';
import { TransactionPayment } from '@/lib/types';

interface PaymentMethodSelectorProps {
  total: number;
  payments: Partial<TransactionPayment>[];
  onPaymentsChange: (payments: Partial<TransactionPayment>[]) => void;
  onSplitToggle: (isSplit: boolean) => void;
  isSplitPayment: boolean;
}

type PaymentMethod = 'card' | 'cash' | 'venmo' | 'zelle';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'venmo', label: 'Venmo', icon: '📱' },
  { value: 'zelle', label: 'Zelle', icon: '📲' },
];

export default function PaymentMethodSelector({
  total,
  payments,
  onPaymentsChange,
  onSplitToggle,
  isSplitPayment,
}: PaymentMethodSelectorProps) {
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>(
    payments.length > 0 ? (payments.map(p => p.method).filter(Boolean) as PaymentMethod[]) : []
  );

  const handleMethodToggle = (method: PaymentMethod) => {
    if (isSplitPayment) {
      // In split mode, toggle method
      const newMethods = selectedMethods.includes(method)
        ? selectedMethods.filter(m => m !== method)
        : [...selectedMethods, method];

      setSelectedMethods(newMethods);

      // Update payments array
      const newPayments = newMethods.map(m => {
        const existing = payments.find(p => p.method === m);
        return existing || {
          id: crypto.randomUUID(),
          method: m,
          amount: 0,
          status: 'pending' as const,
        };
      });

      // If only one method left, assign full amount
      if (newPayments.length === 1) {
        newPayments[0].amount = total;
      }

      onPaymentsChange(newPayments);
    } else {
      // Single payment mode
      setSelectedMethods([method]);
      onPaymentsChange([{
        id: crypto.randomUUID(),
        method,
        amount: total,
        status: 'pending',
      }]);
    }
  };

  const handleSplitToggle = () => {
    const newIsSplit = !isSplitPayment;
    onSplitToggle(newIsSplit);

    if (!newIsSplit && payments.length > 0) {
      // When turning off split, keep only first payment with full amount
      setSelectedMethods([payments[0].method as PaymentMethod]);
      onPaymentsChange([{
        ...payments[0],
        amount: total,
      }]);
    }
  };

  const handleAmountChange = (index: number, amount: number) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], amount };
    onPaymentsChange(newPayments);
  };

  const remainingAmount = total - payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const autoDistributeAmounts = () => {
    if (payments.length === 0) return;

    const amountPerPayment = Math.floor((total / payments.length) * 100) / 100;
    const newPayments = payments.map((p, i) => ({
      ...p,
      amount: i === payments.length - 1
        ? total - (amountPerPayment * (payments.length - 1))
        : amountPerPayment,
    }));
    onPaymentsChange(newPayments);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <button
          type="button"
          onClick={handleSplitToggle}
          className={`text-sm px-3 py-1 rounded-full transition-colors ${
            isSplitPayment
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isSplitPayment ? 'Split Payment ON' : 'Split Payment'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => handleMethodToggle(method.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMethods.includes(method.value)
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{method.icon}</span>
            <span>{method.label}</span>
          </button>
        ))}
      </div>

      {isSplitPayment && payments.length > 1 && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Split Amounts</span>
            <button
              type="button"
              onClick={autoDistributeAmounts}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Split Evenly
            </button>
          </div>

          {payments.map((payment, index) => (
            <div key={payment.id || index} className="flex items-center gap-3">
              <span className="w-16 text-sm text-gray-600 capitalize">
                {payment.method}:
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={payment.amount || ''}
                  onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          ))}

          <div className={`text-sm font-medium ${
            Math.abs(remainingAmount) < 0.01
              ? 'text-emerald-600'
              : 'text-red-600'
          }`}>
            {Math.abs(remainingAmount) < 0.01
              ? 'Amounts balanced'
              : `Remaining: $${remainingAmount.toFixed(2)}`
            }
          </div>
        </div>
      )}

      {payments.length === 0 && (
        <p className="text-sm text-gray-500">Select a payment method</p>
      )}
    </div>
  );
}
