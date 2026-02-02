'use client';

import { useState } from 'react';

interface TipSelectorProps {
  subtotal: number;
  onTipChange: (amount: number) => void;
  selectedTip: number;
}

const TIP_PRESETS = [
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.20 },
  { label: '25%', value: 0.25 },
];

export default function TipSelector({ subtotal, onTipChange, selectedTip }: TipSelectorProps) {
  const [customTip, setCustomTip] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetClick = (percentage: number) => {
    setIsCustom(false);
    setCustomTip('');
    const tipAmount = Math.round(subtotal * percentage * 100) / 100;
    onTipChange(tipAmount);
  };

  const handleNoTip = () => {
    setIsCustom(false);
    setCustomTip('');
    onTipChange(0);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
  };

  const handleCustomChange = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value) || 0;
    onTipChange(amount);
  };

  const isPresetSelected = (percentage: number) => {
    if (isCustom) return false;
    const expectedTip = Math.round(subtotal * percentage * 100) / 100;
    return Math.abs(selectedTip - expectedTip) < 0.01;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Add Tip</label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleNoTip}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTip === 0 && !isCustom
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          No Tip
        </button>

        {TIP_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetClick(preset.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPresetSelected(preset.value)
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
            <span className="ml-1 text-xs opacity-75">
              (${(subtotal * preset.value).toFixed(2)})
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={handleCustomClick}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isCustom
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">$</span>
          <input
            type="number"
            value={customTip}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            autoFocus
          />
        </div>
      )}

      {selectedTip > 0 && (
        <p className="text-sm text-emerald-600 font-medium">
          Tip: ${selectedTip.toFixed(2)}
        </p>
      )}
    </div>
  );
}
