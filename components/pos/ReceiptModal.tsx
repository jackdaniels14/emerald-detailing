'use client';

import { POSTransaction } from '@/lib/types';

interface ReceiptModalProps {
  transaction: POSTransaction;
  clientEmail?: string;
  onClose: () => void;
  onEmailSent?: (email: string) => void;
}

export default function ReceiptModal({
  transaction,
  onClose,
}: ReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-4 print:p-0" id="receipt-content">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-emerald-600">Emerald Detailing</h1>
            <p className="text-gray-500 text-sm">Receipt</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-sm">
              <span className="font-medium">Receipt #:</span> {transaction.receiptNumber}
            </p>
            <p className="text-sm">
              <span className="font-medium">Date:</span>{' '}
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Items */}
          <table className="w-full text-sm mb-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-center p-2">Qty</th>
                <th className="text-right p-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {transaction.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="p-2">{item.description}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-right">
                    {item.type === 'discount' ? '-' : ''}${Math.abs(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${transaction.subtotal.toFixed(2)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span>-${transaction.discount.toFixed(2)}</span>
              </div>
            )}
            {transaction.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>${transaction.tax.toFixed(2)}</span>
              </div>
            )}
            {transaction.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip</span>
                <span>${transaction.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${transaction.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">Payment</p>
            {transaction.payments.map((payment, idx) => (
              <p key={idx} className="text-sm text-gray-600">
                {payment.method.toUpperCase()}
                {payment.cardLast4 && ` (**** ${payment.cardLast4})`}
                : ${payment.amount.toFixed(2)}
              </p>
            ))}
          </div>

          <div className="text-center mt-4 text-sm text-gray-500">
            Thank you for your business!
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
