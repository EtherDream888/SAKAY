import React from 'react';
import {
  Box,
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
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectFilters = [],
  onResetFilters,
  actionButton,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      {/* Left side: Search bar & Select Dropdowns */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          flex: 1,
        }}
      >
        {/* Search Field */}
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
                    <SearchIcon fontSize="small" sx={{ color: 'var(--mac-text-muted)', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              minWidth: { xs: '100%', sm: 260 },
              flex: { xs: '1 1 100%', sm: '0 1 320px' },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                fontSize: '13.5px',
                height: 40,
                border: '1px solid var(--mac-border-color)',
                boxShadow: 'var(--mac-shadow-subtle)',
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

        {/* Dynamic Select Filters */}
        {selectFilters.map((filter) => (
          <FormControl
            key={filter.id}
            size="small"
            sx={{
              minWidth: filter.width || 150,
              flexShrink: 0,
            }}
          >
            <Select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              displayEmpty
              sx={{
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 500,
                color: 'var(--mac-text-primary)',
                height: 40,
                border: '1px solid var(--mac-border-color)',
                boxShadow: 'var(--mac-shadow-subtle)',
                '& fieldset': { border: 'none' },
                '&:hover': {
                  borderColor: 'var(--sakay-orange-border)',
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px var(--sakay-orange-glow)',
                  border: '1px solid var(--sakay-orange)',
                },
              }}
            >
              {filter.options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '13.5px' }}>
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
            startIcon={<RestartAltIcon fontSize="small" sx={{ fontSize: 16 }} />}
            sx={{
              height: 40,
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: 'var(--mac-shadow-subtle)',
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

      {/* Right side: Action Button */}
      {actionButton && (
        <Box sx={{ flexShrink: 0 }}>
          {actionButton}
        </Box>
      )}
    </Box>
  );
};
