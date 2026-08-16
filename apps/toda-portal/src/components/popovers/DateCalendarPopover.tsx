import React, { useState } from 'react';
import { Box, Typography, IconButton, Popover } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface DateCalendarPopoverProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const DateCalendarPopover: React.FC<DateCalendarPopoverProps> = ({
  open,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(newDate);
    onClose();
  };

  const monthYearLabel = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          className: 'mac-glass-popover',
          sx: {
            mt: 1.5,
            p: 2.5,
            width: 320,
            borderRadius: 'var(--mac-radius-lg)',
            boxShadow: 'var(--mac-shadow-popover)',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
          {monthYearLabel}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevMonth}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleNextMonth}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Weekdays */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center', mb: 1 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Typography key={d} sx={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--mac-text-muted)' }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Days grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <Box key={`empty-${i}`} sx={{ height: 32 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected =
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
                transition: 'var(--mac-transition-fast)',
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
