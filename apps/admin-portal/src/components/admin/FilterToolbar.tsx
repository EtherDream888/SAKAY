import React from 'react';
import { Box, InputBase, Select, MenuItem, FormControl, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  selectFilters?: FilterSelectProps[];
  onResetFilters?: () => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectFilters = [],
  onResetFilters,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        padding: '14px 18px',
        boxShadow: 'var(--mac-shadow-subtle)',
        mb: 3,
      }}
    >
      {/* Apple-style Search Field */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          backgroundColor: '#F5F5F7',
          borderRadius: '9px',
          padding: '0 14px',
          height: 40,
          flex: { xs: '1 1 100%', sm: '1 1 320px' },
          maxWidth: 420,
          border: '1px solid var(--mac-border-color)',
          transition: 'var(--mac-transition-fast)',
          '&:focus-within': {
            backgroundColor: '#FFFFFF',
            borderColor: 'var(--sakay-orange)',
            boxShadow: '0 0 0 3px rgba(255, 85, 0, 0.12)',
          },
        }}
      >
        <SearchIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)', fontSize: 20 }} />
        <InputBase
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          sx={{
            flex: 1,
            fontSize: '14px',
            color: 'var(--mac-text-primary)',
            '& input::placeholder': {
              color: 'var(--mac-text-muted)',
              opacity: 1,
            },
          }}
        />
      </Box>

      {/* Select Dropdowns */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        {selectFilters.map((filter) => (
          <FormControl key={filter.id} size="small">
            <Select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value as string)}
              displayEmpty
              sx={{
                height: 40,
                fontSize: '14px',
                fontWeight: 400,
                borderRadius: '9px',
                backgroundColor: '#FFFFFF',
                color: 'var(--mac-text-primary)',
                transition: 'var(--mac-transition-fast)',
                fieldset: { borderColor: 'var(--mac-border-color)' },
                '&:hover': {
                  backgroundColor: 'var(--sakay-orange-soft)',
                  color: 'var(--sakay-orange)',
                  '& fieldset': { borderColor: 'var(--sakay-orange-border)' },
                },
                '&.Mui-focused': {
                  backgroundColor: 'var(--sakay-orange-soft)',
                  color: 'var(--sakay-orange)',
                  '& fieldset': { borderColor: 'var(--sakay-orange)' },
                },
                '& .MuiSelect-icon': {
                  transition: 'color 0.15s ease',
                },
                '&:hover .MuiSelect-icon': {
                  color: 'var(--sakay-orange)',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    className: 'mac-glass-popover',
                    sx: {
                      borderRadius: '10px',
                      mt: 0.5,
                      '& .MuiMenuItem-root': {
                        fontSize: '14px',
                        fontWeight: 400,
                        padding: '8px 16px',
                        '&:hover': {
                          backgroundColor: 'var(--sakay-orange-soft)',
                          color: 'var(--sakay-orange)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'var(--sakay-orange-soft)',
                          color: 'var(--sakay-orange)',
                          fontWeight: 600,
                        },
                      },
                    },
                  },
                },
              }}
            >
              {filter.options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}

        {onResetFilters && (
          <Button
            onClick={onResetFilters}
            startIcon={<RestartAltIcon fontSize="small" sx={{ fontSize: 18 }} />}
            sx={{
              height: 40,
              padding: '0 16px',
              borderRadius: '9px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-muted)',
              fontSize: '13.5px',
              fontWeight: 450,
              textTransform: 'none',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--mac-canvas-bg)',
                color: 'var(--mac-text-primary)',
              },
            }}
          >
            Reset
          </Button>
        )}
      </Box>
    </Box>
  );
};
