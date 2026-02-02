'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Employee, TransactionItem, TransactionPayment, POSTransaction } from '@/lib/types';
import { getEmployees, createTransaction, createTipAllocation, generateReceiptNumber } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';
import TipSelector from '@/components/pos/TipSelector';
import PaymentMethodSelector from '@/components/pos/PaymentMethodSelector';
import TransactionSummary from '@/components/pos/TransactionSummary';
import StripeCardForm from '@/components/pos/StripeCardForm';
import ReceiptModal from '@/components/pos/ReceiptModal';
import QuickSaleItems from '@/components/pos/QuickSaleItems';

export default function WalkInSalePage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer info (optional)
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Assigned employee for tip
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');

  // Transaction state
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [tip, setTip] = useState(0);
  const [payments, setPayments] = useState<Partial<TransactionPayment>[]>([]);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<POSTransaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const employeeList = await getEmployees();
      setEmployees(employeeList.filter(e => e.isActive));
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = items
    .filter(i => i.type !== 'discount')
    .reduce((sum, i) => sum + i.total, 0);

  const discount = Math.abs(
    items
      .filter(i => i.type === 'discount')
      .reduce((sum, i) => sum + i.total, 0)
  );

  const tax = 0; // Washington state - no sales tax on services
  const total = subtotal - discount + tax + tip;

  const handlePaymentComplete = async (
    cardPaymentIntentId?: string,
    cardLast4?: string,
    cardBrand?: string
  ) => {
    if (!userProfile || items.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Update payments with card details if applicable
      const finalPayments: TransactionPayment[] = payments.map(p => {
        if (p.method === 'card' && cardPaymentIntentId) {
          return {
            ...p,
            id: p.id || crypto.randomUUID(),
            stripePaymentIntentId: cardPaymentIntentId,
            cardLast4: cardLast4 || '',
            cardBrand: cardBrand || '',
            status: 'completed' as const,
            processedAt: new Date(),
          } as TransactionPayment;
        }
        return {
          ...p,
          id: p.id || crypto.randomUUID(),
          status: 'completed' as const,
          processedAt: new Date(),
        } as TransactionPayment;
      });

      const receiptNumber = generateReceiptNumber();

      // Create transaction
      const transactionData: Omit<POSTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'walk_in_sale',
        employeeId: userProfile.uid,
        assignedEmployeeId: assignedEmployeeId || undefined,
        items,
        subtotal,
        discount,
        tax,
        tip,
        total,
        payments: finalPayments,
        status: 'completed',
        receiptNumber,
        notes: customerName ? `Customer: ${customerName}` : undefined,
      };

      const transactionId = await createTransaction(transactionData);

      // Create tip allocation if tip exists and employee assigned
      if (tip > 0 && assignedEmployeeId) {
        await createTipAllocation({
          transactionId,
          employeeId: assignedEmployeeId,
          amount: tip,
          status: 'pending',
        });
      }

      // Set completed transaction for receipt
      setCompletedTransaction({
        id: transactionId,
        ...transactionData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setShowReceipt(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNonCardPayment = async () => {
    if (payments.some(p => p.method === 'card')) {
      return;
    }
    await handlePaymentComplete();
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    router.push('/admin/pos');
  };

  const canProcess = () => {
    if (items.length === 0 || payments.length === 0) return false;

    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.abs(totalPayments - total) < 0.01;
  };

  const hasCardPayment = payments.some(p => p.method === 'card');
  const cardPaymentAmount = payments
    .filter(p => p.method === 'card')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const clearSale = () => {
    setItems([]);
    setTip(0);
    setPayments([]);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setAssignedEmployeeId('');
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Walk-in Sale</h1>
          <p className="text-gray-500">Quick sale for walk-in customers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={clearSale}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
          <Link
            href="/admin/pos"
            className="px-4 py-2 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Items & Customer Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info (Optional) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Customer Info (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email (for receipt)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Assign Employee (for tips) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Assign to Employee (for tips)</h3>
            <select
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Sale Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Add Items</h3>
            <QuickSaleItems
              items={items}
              onItemsChange={setItems}
            />
          </div>

          {items.length > 0 && (
            <>
              {/* Tip Selection */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <TipSelector
                  subtotal={subtotal - discount}
                  onTipChange={setTip}
                  selectedTip={tip}
                />
                {assignedEmployeeId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Tip will go to: {employees.find(e => e.id === assignedEmployeeId)?.firstName}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <PaymentMethodSelector
                  total={total}
                  payments={payments}
                  onPaymentsChange={setPayments}
                  onSplitToggle={setIsSplitPayment}
                  isSplitPayment={isSplitPayment}
                />
              </div>

              {/* Stripe Card Form */}
              {hasCardPayment && canProcess() && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Card Payment</h3>
                  <StripeCardForm
                    amount={cardPaymentAmount}
                    onSuccess={(intentId, last4, brand) =>
                      handlePaymentComplete(intentId, last4, brand)
                    }
                    onError={(err) => setError(err)}
                    disabled={isProcessing}
                    description="Emerald Detailing - Walk-in Sale"
                  />
                </div>
              )}

              {/* Non-card payment button */}
              {!hasCardPayment && canProcess() && (
                <button
                  onClick={handleNonCardPayment}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors"
                >
                  {isProcessing ? 'Processing...' : `Complete Payment - $${total.toFixed(2)}`}
                </button>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column - Transaction Summary */}
        <div>
          <TransactionSummary
            items={items}
            subtotal={subtotal}
            discount={discount}
            tax={tax}
            tip={tip}
            total={total}
          />

          {items.length === 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Add items to start
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          clientEmail={customerEmail || undefined}
          onClose={handleReceiptClose}
          onEmailSent={(email) => {
            // Could update transaction with receipt email
          }}
        />
      )}
    </div>
  );
}
