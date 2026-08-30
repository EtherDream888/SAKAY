import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

export interface SakayPhoneInputProps {
  label?: string;
  value: string;
  onChange: (fullNumber: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  readOnly?: boolean;
}

// Extract the 9-digit suffix after the leading '9' (i.e., digits 2-10 of the 10-digit PH number)
export const extract9DigitsAfter9 = (raw: string): string => {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  let national = '';
  if (digits.startsWith('639')) {
    national = digits.slice(2); // keep the 9 + 9 digits
  } else if (digits.startsWith('09')) {
    national = digits.slice(1); // strip leading 0
  } else if (digits.startsWith('9')) {
    national = digits;
  } else {
    national = digits;
  }
  // national is the 10-digit number starting with 9; return it clamped to 10 digits
  return national.slice(0, 10);
};

export const SakayPhoneInput: React.FC<SakayPhoneInputProps> = ({
  label = 'Contact Number',
  value,
  onChange,
  error = false,
  helperText = '',
  required = false,
  readOnly = false,
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // nationalDigits: the 10-digit PH mobile number starting with 9 (e.g. "9123456789")
  // We store only what the user has typed — empty string if nothing entered yet.
  const [nationalDigits, setNationalDigits] = useState<string>(() => {
    if (!value) return '';
    return extract9DigitsAfter9(value);
  });

  useEffect(() => {
    if (!value) {
      setNationalDigits('');
      return;
    }
    setNationalDigits(extract9DigitsAfter9(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    // Strip non-digits
    const rawInput = e.target.value.replace(/\D/g, '');
    // Clamp to 10 digits
    const clamped = rawInput.slice(0, 10);
    setNationalDigits(clamped);
    // Emit full number as "09XXXXXXXXX" format (11 digits starting with 0) or empty
    if (clamped.length > 0) {
      // Ensure it always starts with 9 — if user typed something else, keep it as-is but validate on submit
      const fullNational = clamped.startsWith('9') ? `0${clamped}` : `0${clamped}`;
      onChange(fullNational);
    } else {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    if (e.key === 'Backspace') {
      if (start === end && start === 0) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Delete') {
      if (start === end && start === 0) {
        e.preventDefault();
        return;
      }
    }
  };

  // Click anywhere in the field container focuses the input
  const handleContainerClick = useCallback(() => {
    if (!readOnly) inputRef.current?.focus();
  }, [readOnly]);

  // Display value is exactly what the user typed (the 10-digit national number)
  const displayInputValue = nationalDigits;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        onClick={handleContainerClick}
        sx={{
          width: '100%',
          minHeight: '62px',
          height: '62px',
          borderRadius: '16px',
          backgroundColor: focused ? '#FFFFFF' : '#F1F3F5',
          border: `1.5px solid ${error ? '#DC2626' : focused ? '#FF6B00' : '#E2E8F0'}`,
          boxShadow: focused ? '0 0 0 3px rgba(255, 107, 0, 0.12)' : 'none',
          px: 2,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          cursor: readOnly ? 'default' : 'text',
        }}
      >
        <Typography
          sx={{
            position: 'absolute',
            left: '16px',
            right: '16px',
            top: '8px',
            transform: 'translateY(0)',
            fontSize: '9.5px',
            fontWeight: 700,
            color: error ? '#DC2626' : focused ? '#FF6B00' : '#64748B',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            userSelect: 'none',
            pointerEvents: 'none',
            background: 'transparent',
            lineHeight: 1.15,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800 }}>
              *
            </Box>
          )}
        </Typography>

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            pt: '18px',
            pb: '2px',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mr: 1,
              userSelect: 'none',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              +63
            </Typography>
            <Box
              sx={{
                width: '1.5px',
                height: '18px',
                backgroundColor: '#CBD5E1',
                mx: 1.2,
              }}
            />
          </Box>

          <input
            ref={inputRef}
            type="tel"
            value={displayInputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            readOnly={readOnly}
            placeholder="9XXXXXXXXX"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '15px',
              fontWeight: 600,
              color: '#0F172A',
              fontFamily: 'inherit',
              padding: 0,
              margin: 0,
              letterSpacing: '0.5px',
            }}
          />
        </Box>
      </Box>

      {helperText && (
        <Typography
          sx={{
            fontSize: '11.5px',
            color: error ? '#DC2626' : '#64748B',
            fontWeight: error ? 600 : 400,
            mt: '4px',
            ml: '12px',
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default SakayPhoneInput;
