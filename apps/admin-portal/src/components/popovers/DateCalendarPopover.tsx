import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
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
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleDayClick = (dayNumber: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
    onSelectDate(newDate);
    onClose();
  };

  return (
    <Box
      ref={popoverRef}
      className="mac-glass-popover"
      sx={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 280,
        borderRadius: 'var(--mac-radius-lg)',
        padding: '16px',
        zIndex: 200,
        animation: 'fadeInScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes fadeInScale': {
          '0%': { opacity: 0, transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
      }}
    >
      {/* Month & Year Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'var(--mac-text-primary)' }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Typography>
        <Box sx={{ display: 'flex', gap: '4px' }}>
          <IconButton size="small" onClick={handlePrevMonth} sx={{ color: 'var(--mac-text-secondary)', padding: '4px' }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleNextMonth} sx={{ color: 'var(--mac-text-secondary)', padding: '4px' }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Weekday Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', mb: 1 }}>
        {daysOfWeek.map((day) => (
          <Typography key={day} sx={{ fontSize: '11px', fontWeight: 600, color: 'var(--mac-text-muted)' }}>
            {day}
          </Typography>
        ))}
      </Box>

      {/* Day Cells Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <Box key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const isSelected =
            selectedDate.getDate() === dayNumber &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear();

          return (
            <Box
              key={dayNumber}
              onClick={() => handleDayClick(dayNumber)}
              sx={{
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12.5px',
                fontWeight: isSelected ? 600 : 450,
                borderRadius: '50%',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--sakay-orange)' : 'transparent',
                color: isSelected ? '#FFFFFF' : 'var(--mac-text-primary)',
                transition: 'var(--mac-transition-fast)',
                '&:hover': {
                  backgroundColor: isSelected ? 'var(--sakay-orange-hover)' : 'rgba(0,0,0,0.05)',
                },
              }}
            >
              {dayNumber}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
