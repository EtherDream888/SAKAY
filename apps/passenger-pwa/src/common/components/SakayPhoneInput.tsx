import React, { useState, useEffect } from 'react';
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

// Robust extractor for Philippine mobile numbers (10 digits starting with 9)
export const extractPhDigits10 = (raw: string): string => {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  let d10 = digits;
  
  if (d10.startsWith('6309')) d10 = d10.slice(3);
  else if (d10.startsWith('639')) d10 = d10.slice(2);
  else if (d10.startsWith('09')) d10 = d10.slice(1);
  else if (d10.startsWith('63')) d10 = d10.slice(2);
  else if (d10.startsWith('0')) d10 = d10.slice(1);

  // Deduplicate accidental double 9 when typing with prefill
  if (d10.startsWith('99') && d10.length > 10) d10 = d10.slice(1);
  if (d10.startsWith('909')) d10 = d10.slice(1);
  if (d10.startsWith('09')) d10 = d10.slice(1);

  return d10.slice(0, 10);
};

export const formatPhMobileDisplay = (d10: string): string => {
  if (!d10) return '';
  if (d10.length <= 3) return d10;
  if (d10.length <= 6) return `${d10.slice(0, 3)} ${d10.slice(3)}`;
  return `${d10.slice(0, 3)} ${d10.slice(3, 6)} ${d10.slice(6)}`;
};

export const SakayPhoneInput: React.FC<SakayPhoneInputProps> = ({
  label = 'Numero ng Telepono',
  value,
  onChange,
  error = false,
  helperText = '',
  required = false,
  readOnly = false,
}) => {
  const [focused, setFocused] = useState(false);
  const [digits10, setDigits10] = useState(() => extractPhDigits10(value));

  useEffect(() => {
    setDigits10(extractPhDigits10(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const val = e.target.value;
    const cleanD10 = extractPhDigits10(val);
    setDigits10(cleanD10);
    // Emits standard 11-digit national phone string starting with 09 (e.g. 09350357698)
    const fullNational = cleanD10 ? (cleanD10.startsWith('0') ? cleanD10 : `0${cleanD10}`) : '';
    onChange(fullNational);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      if (start === end && start > 0 && displayInputValue[start - 1] === ' ') {
        e.preventDefault();
        const next = digits10.slice(0, -1);
        setDigits10(next);
        onChange(next ? (next.startsWith('0') ? next : `0${next}`) : '');
      }
    }
  };

  const displayInputValue = formatPhMobileDisplay(digits10);

  return (
    <Box sx={{ width: '100%' }}>
      <Box
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
          cursor: 'text',
        }}
      >
        {/* Floating Label inside container */}
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

        {/* Prefix & Input Row */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            pt: '18px',
            pb: '2px',
          }}
        >
          {/* Fixed Non-Editable +63 with Vertical Line Separator */}
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

          {/* Editable text input */}
          <input
            type="tel"
            placeholder={focused ? '9XX XXX XXXX' : ''}
            value={displayInputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            readOnly={readOnly}
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
