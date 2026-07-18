"use client";

import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from './input';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onValueChange?: (value: number) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, defaultValue, onChange, onValueChange, name, ...props }, ref) => {
    const formatVal = (val: string | number | readonly string[] | undefined) => {
      if (val === undefined || val === null || val === '') return '';
      const numericValue = val.toString().replace(/\D/g, '');
      if (!numericValue) return '';
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(parseInt(numericValue, 10));
    };

    const initialVal = value !== undefined ? value : defaultValue;
    const [displayValue, setDisplayValue] = useState(formatVal(initialVal));

    useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatVal(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = rawValue.replace(/\D/g, '');
      const formatted = formatVal(numericValue);
      
      setDisplayValue(formatted);
      
      const num = numericValue ? parseInt(numericValue, 10) : 0;
      if (onValueChange) {
        onValueChange(num);
      }
      
      if (onChange) {
        // Create synthetic event for react-hook-form or parent handlers
        const clonedEvent = {
          ...e,
          target: {
            ...e.target,
            value: numericValue,
            name: name || ''
          }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(clonedEvent);
      }
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={props.placeholder ? formatVal(props.placeholder) : undefined}
        />
        {name && (
          <input type="hidden" name={name} value={displayValue.replace(/\D/g, '')} />
        )}
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';
