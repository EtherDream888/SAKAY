import React, { useState } from 'react';
import { Box, Typography, IconButton, Popover, Select, MenuItem } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';

interface DateCalendarPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const DateCalendarPopover: React.FC<DateCalendarPopoverProps> = ({
  open,
  onClose,
  anchorEl,
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
  };

  const handleNextYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
  };

  const handleYearChange = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(newDate);
    onClose();
  };

  const monthLabel = currentMonth.toLocaleString('en-US', { month: 'long' });
  const currentYear = currentMonth.getFullYear();

  // Generate a list of years from 1980 to current year + 1
  const startYear = 1980;
  const endYear = new Date().getFullYear();
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            p: 2.5,
            width: 320,
            borderRadius: '14px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.12)',
            border: '1px solid var(--mac-border-color)',
            backgroundColor: '#FFFFFF',
          },
        },
      }}
    >
      {/* Month & Year Navigation Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            {monthLabel}
          </Typography>
          <Select
            value={currentYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            size="small"
            variant="standard"
            disableUnderline
            sx={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--sakay-orange)',
              cursor: 'pointer',
              '& .MuiSelect-select': { py: 0, pr: '18px !important' },
            }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y} sx={{ fontSize: '13px', py: 0.75 }}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton size="small" onClick={handlePrevYear} title="Previous Year" sx={{ p: 0.5 }}>
            <KeyboardDoubleArrowLeftIcon sx={{ fontSize: 18, color: 'var(--mac-text-muted)' }} />
          </IconButton>
          <IconButton size="small" onClick={handlePrevMonth} title="Previous Month" sx={{ p: 0.5 }}>
            <ChevronLeftIcon sx={{ fontSize: 20, color: 'var(--mac-text-secondary)' }} />
          </IconButton>
          <IconButton size="small" onClick={handleNextMonth} title="Next Month" sx={{ p: 0.5 }}>
            <ChevronRightIcon sx={{ fontSize: 20, color: 'var(--mac-text-secondary)' }} />
          </IconButton>
          <IconButton size="small" onClick={handleNextYear} title="Next Year" sx={{ p: 0.5 }}>
            <KeyboardDoubleArrowRightIcon sx={{ fontSize: 18, color: 'var(--mac-text-muted)' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Weekdays Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center', mb: 1 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Typography key={d} sx={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--mac-text-muted)' }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Days Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <Box key={`empty-${i}`} sx={{ height: 32 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected =
            selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear();

          return (
            <Box
              key={day}
              onClick={() => handleDayClick(day)}
              sx={{
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? 'var(--sakay-orange)' : 'transparent',
                color: isSelected ? '#FFFFFF' : 'var(--mac-text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: isSelected ? 'var(--sakay-orange)' : 'var(--sakay-orange-soft)',
                  color: isSelected ? '#FFFFFF' : 'var(--sakay-orange)',
                },
              }}
            >
              {day}
            </Box>
          );
        })}
      </Box>
    </Popover>
  );
};
