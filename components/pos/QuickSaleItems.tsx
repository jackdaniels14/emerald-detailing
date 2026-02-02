'use client';

import { useState } from 'react';
import { TransactionItem } from '@/lib/types';

interface QuickSaleItemsProps {
  items: TransactionItem[];
  onItemsChange: (items: TransactionItem[]) => void;
}

// Predefined services matching the booking system
const QUICK_SERVICES = {
  interior: [
    { name: 'Express Interior', price: 150 },
    { name: 'Premium Interior', price: 360 },
  ],
  exterior: [
    { name: 'Express Exterior', price: 120 },
    { name: 'Premium Exterior', price: 300 },
  ],
  full: [
    { name: 'Express Full Detail', price: 242 },
    { name: 'Premium Full Detail', price: 528 },
  ],
};

const ADD_ONS = [
  { name: 'Pet Hair Removal', price: 40 },
  { name: 'Engine Bay Cleaning', price: 60 },
  { name: 'Headlight Restoration', price: 80 },
  { name: 'Ceramic Coating', price: 200 },
  { name: 'Odor Elimination', price: 50 },
  { name: 'Leather Conditioning', price: 45 },
];

const VEHICLE_SURCHARGES = [
  { name: 'SUV Surcharge', price: 25 },
  { name: 'Truck Surcharge', price: 30 },
  { name: 'Van Surcharge', price: 40 },
];

export default function QuickSaleItems({ items, onItemsChange }: QuickSaleItemsProps) {
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const addItem = (description: string, price: number, type: 'service' | 'addon' | 'product' = 'service') => {
    const newItem: TransactionItem = {
      id: crypto.randomUUID(),
      description,
      type,
      quantity: 1,
      unitPrice: price,
      total: price,
    };
    onItemsChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    onItemsChange(
      items.map(item =>
        item.id === id
          ? { ...item, quantity, total: item.unitPrice * quantity }
          : item
      )
    );
  };

  const addCustomItem = () => {
    if (!customName.trim() || !customPrice) return;

    addItem(customName.trim(), parseFloat(customPrice), 'product');
    setCustomName('');
    setCustomPrice('');
  };

  const addDiscount = () => {
    const discountAmount = prompt('Enter discount amount:');
    if (!discountAmount) return;

    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newItem: TransactionItem = {
      id: crypto.randomUUID(),
      description: 'Discount',
      type: 'discount',
      quantity: 1,
      unitPrice: -amount,
      total: -amount,
    };
    onItemsChange([...items, newItem]);
  };

  return (
    <div className="space-y-6">
      {/* Current Items */}
      {items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Cart Items</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <p className={`font-medium ${item.type === 'discount' ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {item.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${Math.abs(item.unitPrice).toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.type !== 'discount' && (
                    <div className="flex items-center border border-gray-200 rounded">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <span className={`font-medium w-20 text-right ${item.type === 'discount' ? 'text-emerald-600' : ''}`}>
                    {item.type === 'discount' ? '-' : ''}${Math.abs(item.total).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Services */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Services</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(QUICK_SERVICES).map(([category, services]) =>
            services.map((service) => (
              <button
                key={service.name}
                onClick={() => addItem(service.name, service.price)}
                className="p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <p className="font-medium text-gray-900 text-sm">{service.name}</p>
                <p className="text-emerald-600 text-sm">${service.price}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Add-ons</h3>
        <div className="flex flex-wrap gap-2">
          {ADD_ONS.map((addon) => (
            <button
              key={addon.name}
              onClick={() => addItem(addon.name, addon.price, 'addon')}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
            >
              {addon.name} <span className="text-emerald-600">${addon.price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Surcharges */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Vehicle Surcharges</h3>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_SURCHARGES.map((surcharge) => (
            <button
              key={surcharge.name}
              onClick={() => addItem(surcharge.name, surcharge.price, 'addon')}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
            >
              {surcharge.name} <span className="text-emerald-600">+${surcharge.price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Item */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Item</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Item description"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <div className="flex items-center">
            <span className="text-gray-500 mr-1">$</span>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={addCustomItem}
            disabled={!customName.trim() || !customPrice}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Discount Button */}
      <button
        onClick={addDiscount}
        className="w-full px-4 py-2 border border-dashed border-emerald-400 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
      >
        + Add Discount
      </button>
    </div>
  );
}
