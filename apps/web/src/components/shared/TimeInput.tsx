'use client';

import { forwardRef } from 'react';

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          placeholder="HH:MM"
          maxLength={5}
          pattern="\d{2}:\d{2}"
          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
          onChange={(e) => {
            // Auto-format: insert colon after 2 digits
            let val = e.target.value.replace(/[^\d:]/g, '');
            if (val.length === 2 && !val.includes(':')) {
              val = val + ':';
              e.target.value = val;
            }
            if (props.onChange) props.onChange(e);
          }}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

TimeInput.displayName = 'TimeInput';

export default TimeInput;
