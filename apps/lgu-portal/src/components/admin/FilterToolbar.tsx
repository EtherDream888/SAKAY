import React from 'react';
import {
  Box,
  Card,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export interface FilterOption {
  label: string;
  value: string;
}

export interface SelectFilterProps {
  id: string;
  label?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  width?: number | string;
}

export interface FilterToolbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  selectFilters?: SelectFilterProps[];
  onResetFilters?: () => void;
  actionButton?: React.ReactNode;
  disableMarginBottom?: boolean;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectFilters = [],
  onResetFilters,
  actionButton,
  disableMarginBottom = false,
}) => {
  return (
    <Card
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 'var(--mac-radius-lg)',
        border: '1px solid var(--mac-border-color)',
        backgroundColor: '#FFFFFF',
        boxShadow: 'var(--mac-shadow-card)',
        mb: disableMarginBottom ? 0 : 3.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left side: Search Field */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 1 360px' } }}>
          {onSearchChange && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)', fontSize: '14.4' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  fontSize: '11.6px',
                  height: 42,
                  border: '1px solid var(--mac-border-color)',
                  transition: 'var(--mac-transition-fast)',
                  '& fieldset': { border: 'none' },
                  '&:hover': {
                    backgroundColor: '#FFFFFF',
                    borderColor: 'var(--sakay-orange-border)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 0 0 3px var(--sakay-orange-glow)',
                    border: '1px solid var(--sakay-orange)',
                  },
                },
              }}
            />
          )}
        </Box>

        {/* Rightmost side: Select Dropdowns, Reset Button & Optional Action Button */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
            gap: 1.5,
            ml: { md: 'auto' },
          }}
        >
          {/* Dynamic Select Filters */}
          {selectFilters.map((filter) => (
            <FormControl
              key={filter.id}
              size="small"
              sx={{
                minWidth: filter.width || 160,
                flexShrink: 0,
              }}
            >
              <Select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: '10px',
                  backgroundColor: '#FAFAFC',
                  fontSize: '11.6px',
                  fontWeight: 500,
                  color: 'var(--mac-text-primary)',
                  height: 42,
                  border: '1px solid var(--mac-border-color)',
                  '& fieldset': { border: 'none' },
                  '&:hover': {
                    borderColor: 'var(--sakay-orange-border)',
                    backgroundColor: '#FFFFFF',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 0 0 3px var(--sakay-orange-glow)',
                    border: '1px solid var(--sakay-orange)',
                    backgroundColor: '#FFFFFF',
                  },
                }}
              >
                {filter.options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '11.6px' }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}

          {/* Reset Filter Button */}
          {onResetFilters && (
            <Button
              size="small"
              onClick={onResetFilters}
              startIcon={<RestartAltIcon fontSize="small" sx={{ fontSize: '14.4' }} />}
              sx={{
                height: 42,
                padding: '0 16px',
                borderRadius: '10px',
                border: '1px solid var(--mac-border-color)',
                backgroundColor: '#FAFAFC',
                color: 'var(--mac-text-secondary)',
                fontSize: '11.3px',
                fontWeight: 500,
                textTransform: 'none',
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: 'var(--sakay-orange-soft)',
                  color: 'var(--sakay-orange)',
                  borderColor: 'var(--sakay-orange-border)',
                },
              }}
            >
              Reset
            </Button>
          )}

          {/* Optional Action Button */}
          {actionButton && (
            <Box sx={{ flexShrink: 0, ml: 0.5 }}>
              {actionButton}
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
};
