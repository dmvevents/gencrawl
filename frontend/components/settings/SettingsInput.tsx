'use client';

import React from 'react';

interface SettingsInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'url';
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}

export function SettingsInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  description,
  disabled = false,
  min,
  max,
  step,
  error,
}: SettingsInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`
          block w-full px-3 py-2 rounded-lg border text-sm
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          dark:bg-gray-800 dark:text-white
          ${error
            ? 'border-red-500 dark:border-red-500'
            : 'border-gray-300 dark:border-gray-600'
          }
        `}
      />

      {description && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
