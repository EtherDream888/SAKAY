import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DateCalendarPopover } from '../popovers/DateCalendarPopover';

interface WelcomeHeaderProps {
  welcomeText?: string;
  supportingText?: string;
  showDateSelector?: boolean;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  welcomeText = 'Welcome back, LGU Admin! 👋',
  supportingText = 'Here is your municipal transport operations overview for today.',
  showDateSelector = true,
}) => {
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 4, 12)); // May 12, 2026

  const formatDateLabel = (date: Date) => {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 240 }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--mac-text-primary)',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}
        >
          {welcomeText}
        </Typography>
        {supportingText && (
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--mac-text-muted)',
              lineHeight: 1.3,
              mt: '3px',
            }}
          >
            {supportingText}
          </Typography>
        )}
      </Box>

      {showDateSelector && (
        <Box sx={{ position: 'relative', flexShrink: 0, pt: '2px' }}>
          <Button
            onClick={() => setDateOpen(!dateOpen)}
            startIcon={<CalendarTodayIcon fontSize="small" sx={{ fontSize: 15 }} />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 17 }} />}
            sx={{
              height: 38,
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: 'var(--mac-shadow-subtle)',
              transition: 'var(--mac-transition-fast)',
              '&:hover': {
                backgroundColor: 'var(--sakay-orange-soft)',
                color: 'var(--sakay-orange)',
                borderColor: 'var(--sakay-orange-border)',
              },
            }}
          >
            {formatDateLabel(selectedDate)}
          </Button>

          <DateCalendarPopover
            open={dateOpen}
            onClose={() => setDateOpen(false)}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Box>
      )}
    </Box>
  );
};
