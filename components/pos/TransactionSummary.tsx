'use client';

import { TransactionItem } from '@/lib/types';

interface TransactionSummaryProps {
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  showTip?: boolean;
}

export default function TransactionSummary({
  items,
  subtotal,
  discount,
  tax,
  tip,
  total,
  showTip = true,
}: TransactionSummaryProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Transaction Summary</h3>
      </div>

      <div className="p-4">
        {/* Items List */}
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div className="flex-1">
                <span className={item.type === 'discount' ? 'text-emerald-600' : 'text-gray-700'}>
                  {item.description}
                </span>
                {item.quantity > 1 && (
                  <span className="text-gray-500 ml-1">x{item.quantity}</span>
                )}
              </div>
              <span className={item.type === 'discount' ? 'text-emerald-600' : 'text-gray-900'}>
                {item.type === 'discount' ? '-' : ''}${Math.abs(item.total).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">${subtotal.toFixed(2)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Discount</span>
              <span className="text-emerald-600">-${discount.toFixed(2)}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">${tax.toFixed(2)}</span>
            </div>
          )}

          {showTip && tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tip</span>
              <span className="text-gray-900">${tip.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-emerald-600">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
