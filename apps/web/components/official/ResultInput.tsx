'use client';

import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface ResultInputProps {
  value: string;
  onChange: (value: string) => void;
  unit?: 'm' | 'cm';
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function ResultInput({
  value,
  onChange,
  unit = 'm',
  placeholder = '0.00',
  autoFocus = false,
  disabled = false,
}: ResultInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Only allow numbers and decimal point
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '') {
      onChange(newValue);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          'w-full text-center text-3xl font-mono font-bold py-4 px-6 rounded-lg border-2',
          'transition-colors focus:outline-none',
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-400'
            : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
        )}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-500 font-medium">
        {unit}
      </span>
    </div>
  );
}

// Wind input for throws/jumps
interface WindInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function WindInput({
  value,
  onChange,
  disabled = false,
}: WindInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow negative numbers and decimal
    if (/^-?[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '' || newValue === '-') {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Vind:</label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder="0.0"
          disabled={disabled}
          className={clsx(
            'w-20 text-center text-lg font-mono py-1 px-2 rounded border',
            'transition-colors focus:outline-none',
            disabled
              ? 'bg-gray-100 border-gray-200 text-gray-400'
              : 'bg-white border-gray-300 focus:border-blue-500'
          )}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          m/s
        </span>
      </div>
    </div>
  );
}
