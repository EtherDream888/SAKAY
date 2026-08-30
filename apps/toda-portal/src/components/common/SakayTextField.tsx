import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

export interface SakayTextFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  helperText?: string;
  endAdornment?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}

export const SakayTextField: React.FC<SakayTextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onClick,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  readOnly = false,
  error = false,
  helperText = '',
  endAdornment,
  onFocus,
  onBlur,
  onKeyDown,
  autoComplete,
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value && value.length > 0) || Boolean(readOnly && value);

  // Strip trailing asterisks from label string if passed explicitly
  const cleanLabel = label.replace(/\s*\*\s*$/g, '').trim();

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        onClick={onClick}
        sx={{
          width: '100%',
          minHeight: '62px',
          height: '62px',
          borderRadius: '16px',
          backgroundColor: disabled ? '#F8FAFC' : focused ? '#FFFFFF' : '#F1F3F5',
          border: `1.5px solid ${
            error ? '#DC2626' : focused ? '#FF6B00' : '#E2E8F0'
          }`,
          boxShadow: focused ? '0 0 0 3px rgba(255, 107, 0, 0.12)' : 'none',
          px: 2,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {/* Floating Label inside field */}
        <Typography
          sx={{
            position: 'absolute',
            left: '16px',
            right: endAdornment ? '52px' : '16px',
            top: isFloating ? '8px' : '50%',
            transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isFloating ? '9.5px' : '14.5px',
            fontWeight: isFloating ? 700 : 500,
            color: error ? '#DC2626' : focused ? '#FF6B00' : isFloating ? '#64748B' : '#94A3B8',
            letterSpacing: isFloating ? '0.5px' : '0px',
            textTransform: isFloating ? 'uppercase' : 'none',
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: isFloating ? 'normal' : 'nowrap',
            wordBreak: 'break-word',
            lineHeight: 1.15,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
          }}
        >
          <span>{cleanLabel}</span>
          {required && (
            <Box component="span" sx={{ color: '#FF6B00', fontWeight: 800, ml: '2px' }}>
              *
            </Box>
          )}
        </Typography>

        {/* Input Field Container */}
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            pt: isFloating ? '18px' : 0,
            pb: isFloating ? '2px' : 0,
          }}
        >
          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            readOnly={readOnly}
            autoComplete={autoComplete}
            placeholder={isFloating ? placeholder : ''}
            onFocus={() => {
              setFocused(true);
              if (onFocus) onFocus();
            }}
            onBlur={() => {
              setFocused(false);
              if (onBlur) onBlur();
            }}
            onKeyDown={onKeyDown}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '15px',
              fontWeight: 600,
              color: readOnly ? '#475569' : '#0F172A',
              fontFamily: 'inherit',
              padding: 0,
              margin: 0,
            }}
          />
        </Box>

        {/* Trailing End Adornment Action */}
        {endAdornment && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ml: 1,
              flexShrink: 0,
            }}
          >
            {endAdornment}
          </Box>
        )}
      </Box>

      {/* Helper / Error Text */}
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
