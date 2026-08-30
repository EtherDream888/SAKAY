import React, { useState } from 'react';
import { Box, Typography, Popover, Select, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface DateCalendarPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DateCalendarPopover: React.FC<DateCalendarPopoverProps> = ({
  open,
  onClose,
  anchorEl,
  selectedDate,
  onSelectDate,
}) => {
  const safeDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(safeDate.getFullYear(), safeDate.getMonth(), 1)
  );

  React.useEffect(() => {
    if (open) {
      const today = new Date();
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  }, [open]);

  const currentYear = currentMonth.getFullYear();
  const currentMonthIdx = currentMonth.getMonth();

  const handleMonthChange = (monthIdx: number) => {
    setCurrentMonth(new Date(currentYear, monthIdx, 1));
  };

  const handleYearChange = (year: number) => {
    setCurrentMonth(new Date(year, currentMonthIdx, 1));
  };

  // Calendar Grid Calculations
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonthIdx, 1).getDay();

  // Prev month overflow days
  const prevMonthDays = new Date(currentYear, currentMonthIdx, 0).getDate();

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonthIdx, day);
    onSelectDate(newDate);
    onClose();
  };

  // Year list from 1950 to currentYear + 10
  const startYear = 1950;
  const endYear = new Date().getFullYear() + 10;
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
            width: 300,
            borderRadius: '20px',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          },
        },
      }}
    >
      {/* 1. Header with Side-by-Side Pill Dropdowns (Matching Reference Image) */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
        {/* Month Selector Pill */}
        <Box
          sx={{
            flex: 1.2,
            backgroundColor: '#F5F5F7',
            borderRadius: '12px',
            px: 1.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Select
            value={currentMonthIdx}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            variant="standard"
            disableUnderline
            fullWidth
            IconComponent={(props) => (
              <ExpandMoreIcon {...props} sx={{ color: '#0F172A', fontSize: 18, right: 0 }} />
            )}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    maxHeight: 200,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              },
            }}
            sx={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              '& .MuiSelect-select': { py: 0.5, pr: '20px !important' },
            }}
          >
            {MONTH_NAMES.map((m, idx) => (
              <MenuItem key={m} value={idx} sx={{ fontSize: '13px', fontWeight: 600, py: 0.75 }}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Year Selector Pill */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#F5F5F7',
            borderRadius: '12px',
            px: 1.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Select
            value={currentYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            variant="standard"
            disableUnderline
            fullWidth
            IconComponent={(props) => (
              <ExpandMoreIcon {...props} sx={{ color: '#0F172A', fontSize: 18, right: 0 }} />
            )}
            MenuProps={{
              slotProps: {
                paper: {
                  sx: {
                    maxHeight: 200,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              },
            }}
            sx={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              '& .MuiSelect-select': { py: 0.5, pr: '20px !important' },
            }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y} sx={{ fontSize: '13px', fontWeight: 600, py: 0.75 }}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      {/* 2. Weekdays Header Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          textAlign: 'center',
          mb: 1.5,
        }}
      >
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
          <Typography key={d} sx={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.2px' }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* 3. Days Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {/* Previous Month Overflow Days (Muted soft gray) */}
        {Array.from({ length: firstDayIndex }).map((_, i) => {
          const dayNum = prevMonthDays - firstDayIndex + i + 1;
          return (
            <Box
              key={`prev-${i}`}
              sx={{
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12.5px',
                fontWeight: 500,
                color: '#CBD5E1',
                userSelect: 'none',
              }}
            >
              {String(dayNum).padStart(2, '0')}
            </Box>
          );
        })}

        {/* Current Month Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected =
            safeDate &&
            safeDate.getDate() === day &&
            safeDate.getMonth() === currentMonthIdx &&
            safeDate.getFullYear() === currentYear;

          return (
            <Box
              key={day}
              onClick={() => handleDayClick(day)}
              sx={{
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 600,
                  backgroundColor: isSelected ? '#FF6B00' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#0F172A',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: isSelected ? '#FF6B00' : '#FFF0E6',
                    color: isSelected ? '#FFFFFF' : '#FF6B00',
                  },
                }}
              >
                {String(day).padStart(2, '0')}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Popover>
  );
};
