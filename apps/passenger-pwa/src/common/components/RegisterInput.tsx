import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

export interface RegisterInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  error?: boolean;
  helperText?: string;
  endAdornment?: React.ReactNode;
  isPhone?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  shake?: boolean;
  multiline?: boolean;
  rows?: number;
  max?: string;
}

export const RegisterInput: React.FC<RegisterInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  error = false,
  helperText = '',
  endAdornment,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder,
  readOnly = false,
  required = false,
  shake = false,
  multiline = false,
  rows = 3,
  max,
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value && value.length > 0) || type === 'date';

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        className={shake ? 'anim-shake' : ''}
        sx={{
          width: '100%',
          minHeight: multiline ? `${rows * 24 + 40}px` : '62px',
          height: multiline ? 'auto' : '62px',
          borderRadius: '16px',
          backgroundColor: focused ? '#FFFFFF' : '#F1F3F5',
          border: `1.5px solid ${error ? '#DC2626' : focused ? '#FF6B00' : '#E2E8F0'}`,
          boxShadow: focused
            ? '0 0 0 3px rgba(255, 107, 0, 0.12)'
            : 'none',
          px: 2,
          py: multiline ? 1.25 : 0,
          position: 'relative',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          cursor: 'text',
        }}
      >
        <Typography
          sx={{
            position: 'absolute',
            left: '16px',
            right: endAdornment ? '48px' : '16px',
            top: isFloating ? '8px' : multiline ? '18px' : '50%',
            transform: isFloating ? 'translateY(0)' : multiline ? 'none' : 'translateY(-50%)',
            fontSize: isFloating ? '9.5px' : '14px',
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
            zIndex: 1,
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: '#DC2626', ml: '3px', fontWeight: 800 }}>
              *
            </Box>
          )}
        </Typography>

        <Box
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: multiline ? 'flex-start' : 'center',
            pt: isFloating ? '18px' : 0,
            pb: isFloating ? '2px' : 0,
          }}
        >
          {multiline ? (
            <textarea
              rows={rows}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                if (onFocus) onFocus();
              }}
              onBlur={() => {
                setFocused(false);
                if (onBlur) onBlur();
              }}
              onKeyDown={onKeyDown}
              readOnly={readOnly}
              placeholder={isFloating ? placeholder : ''}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
                fontFamily: 'inherit',
                padding: 0,
                margin: 0,
                resize: 'none',
              }}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                if (onFocus) onFocus();
              }}
              onBlur={() => {
                setFocused(false);
                if (onBlur) onBlur();
              }}
              onKeyDown={onKeyDown}
              readOnly={readOnly}
              placeholder={isFloating ? placeholder : ''}
              max={max}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
                fontFamily: 'inherit',
                padding: 0,
                margin: 0,
              }}
            />
          )}
        </Box>

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

export default RegisterInput;
