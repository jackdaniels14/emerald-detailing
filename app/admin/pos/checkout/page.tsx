'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Booking, Client, Employee, TransactionItem, TransactionPayment, POSTransaction } from '@/lib/types';
import { getPendingCheckouts, getClients, getEmployees, getClient, createTransaction, updateBooking, createTipAllocation, generateReceiptNumber } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';
import TipSelector from '@/components/pos/TipSelector';
import PaymentMethodSelector from '@/components/pos/PaymentMethodSelector';
import TransactionSummary from '@/components/pos/TransactionSummary';
import StripeCardForm from '@/components/pos/StripeCardForm';
import ReceiptModal from '@/components/pos/ReceiptModal';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const bookingIdParam = searchParams.get('bookingId');

  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (bookingIdParam && pendingBookings.length > 0) {
      const booking = pendingBookings.find(b => b.id === bookingIdParam);
      if (booking) {
        handleSelectBooking(booking);
      }
    }
  }, [bookingIdParam, pendingBookings]);

  const loadData = async () => {
    try {
      const [bookings, clientList, employeeList] = await Promise.all([
        getPendingCheckouts(),
        getClients(),
        getEmployees(),
      ]);

      setPendingBookings(bookings);

      const clientMap: Record<string, Client> = {};
      clientList.forEach(c => { clientMap[c.id] = c; });
      setClients(clientMap);

      const employeeMap: Record<string, Employee> = {};
      employeeList.forEach(e => { employeeMap[e.id] = e; });
      setEmployees(employeeMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = async (booking: Booking) => {
    setSelectedBooking(booking);
    setTip(0);
    setPayments([]);
    setError(null);

    // Build transaction items from booking
    const transactionItems: TransactionItem[] = [];

    // Main service
    transactionItems.push({
      id: crypto.randomUUID(),
      description: `${booking.serviceTier.charAt(0).toUpperCase() + booking.serviceTier.slice(1)} ${booking.serviceType.charAt(0).toUpperCase() + booking.serviceType.slice(1)} Detail`,
      type: 'service',
      quantity: 1,
      unitPrice: booking.basePrice,
      total: booking.basePrice,
    });

    // Add-ons
    if (booking.addOns && booking.addOns.length > 0) {
      booking.addOns.forEach((addon, idx) => {
        transactionItems.push({
          id: crypto.randomUUID(),
          description: addon,
          type: 'addon',
          quantity: 1,
          unitPrice: booking.addOnsPrice / booking.addOns.length,
          total: booking.addOnsPrice / booking.addOns.length,
        });
      });
    }

    // Discount
    if (booking.discount > 0) {
      transactionItems.push({
        id: crypto.randomUUID(),
        description: 'Discount',
        type: 'discount',
        quantity: 1,
        unitPrice: -booking.discount,
        total: -booking.discount,
      });
    }

    setItems(transactionItems);
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
    if (!selectedBooking || !userProfile) return;

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
        type: 'booking_checkout',
        bookingId: selectedBooking.id,
        clientId: selectedBooking.clientId,
        employeeId: userProfile.uid,
        assignedEmployeeId: selectedBooking.employeeId,
        items,
        subtotal,
        discount,
        tax,
        tip,
        total,
        payments: finalPayments,
        status: 'completed',
        receiptNumber,
      };

      const transactionId = await createTransaction(transactionData);

      // Create tip allocation if tip exists and employee assigned
      if (tip > 0 && selectedBooking.employeeId) {
        await createTipAllocation({
          transactionId,
          employeeId: selectedBooking.employeeId,
          amount: tip,
          status: 'pending',
        });
      }

      // Update booking payment status
      await updateBooking(selectedBooking.id, {
        paymentStatus: 'paid',
        paymentMethod: finalPayments[0]?.method,
        paymentDate: new Date(),
      });

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
      // Card payment needs Stripe processing
      return;
    }
    await handlePaymentComplete();
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    router.push('/admin/pos');
  };

  const canProcess = () => {
    if (!selectedBooking || payments.length === 0) return false;

    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return Math.abs(totalPayments - total) < 0.01;
  };

  const hasCardPayment = payments.some(p => p.method === 'card');
  const cardPaymentAmount = payments
    .filter(p => p.method === 'card')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

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
          <h1 className="text-2xl font-bold text-gray-900">Checkout Booking</h1>
          <p className="text-gray-500">Process payment for completed services</p>
        </div>
        <Link
          href="/admin/pos"
          className="text-gray-500 hover:text-gray-700"
        >
          Back to POS
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Selection */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedBooking ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Select a Booking</h2>
              </div>
              {pendingBookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending checkouts
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {pendingBookings.map((booking) => {
                    const client = clients[booking.clientId];
                    const employee = booking.employeeId ? employees[booking.employeeId] : null;

                    return (
                      <button
                        key={booking.id}
                        onClick={() => handleSelectBooking(booking)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.serviceType} {booking.serviceTier}
                            </p>
                            {employee && (
                              <p className="text-xs text-gray-400">
                                Serviced by: {employee.firstName}
                              </p>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">
                            ${booking.totalPrice.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected Booking Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {clients[selectedBooking.clientId]?.firstName} {clients[selectedBooking.clientId]?.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedBooking.vehicleInfo || 'Vehicle info'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBooking(null);
                      setItems([]);
                      setTip(0);
                      setPayments([]);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Tip Selection */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <TipSelector
                  subtotal={subtotal - discount}
                  onTipChange={setTip}
                  selectedTip={tip}
                />
                {selectedBooking.employeeId && employees[selectedBooking.employeeId] && (
                  <p className="mt-2 text-xs text-gray-500">
                    Tip will go to: {employees[selectedBooking.employeeId].firstName} {employees[selectedBooking.employeeId].lastName}
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

              {/* Stripe Card Form - only show if card payment selected */}
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
                    description={`Emerald Detailing - ${selectedBooking.serviceType} ${selectedBooking.serviceTier}`}
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

        {/* Transaction Summary */}
        <div>
          {selectedBooking && (
            <TransactionSummary
              items={items}
              subtotal={subtotal}
              discount={discount}
              tax={tax}
              tip={tip}
              total={total}
            />
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          clientEmail={selectedBooking?.clientId ? clients[selectedBooking.clientId]?.email : undefined}
          onClose={handleReceiptClose}
          onEmailSent={(email) => {
            // Update transaction with receipt email
          }}
        />
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
