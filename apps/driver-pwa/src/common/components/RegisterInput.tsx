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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export const RegisterInput: React.FC<RegisterInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  error = false,
  helperText = '',
  endAdornment,
  isPhone = false,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder,
  readOnly = false,
}) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || Boolean(value && value.length > 0);

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
          boxShadow: focused
            ? '0 0 0 3px rgba(255, 107, 0, 0.12)'
            : 'none',
          px: 2,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
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
            top: isFloating ? '8px' : '50%',
            transform: isFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isFloating ? '9.5px' : '15px',
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
          }}
        >
          {label}
        </Typography>

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
            }}
          />
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
