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
  welcomeText = 'Welcome back! 👋',
  supportingText = 'Here is your TODA fleet availability and daily operational monitoring summary.',
  showDateSelector = true,
}) => {
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
        mb: 3.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 240 }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: '28px',
            fontWeight: 600,
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
              fontSize: '15px',
              color: 'var(--mac-text-muted)',
              mt: '4px',
            }}
          >
            {supportingText}
          </Typography>
        )}
      </Box>

      {showDateSelector && (
        <Box sx={{ position: 'relative', flexShrink: 0, pt: '2px' }}>
          <Button
            onClick={(e) => setDateAnchor(e.currentTarget)}
            startIcon={<CalendarTodayIcon fontSize="small" sx={{ fontSize: 18 }} />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 18 }} />}
            sx={{
              height: 44,
              padding: '0 20px',
              borderRadius: '10px',
              border: '1px solid var(--mac-border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--mac-text-primary)',
              fontSize: '15px',
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
            open={Boolean(dateAnchor)}
            anchorEl={dateAnchor}
            onClose={() => setDateAnchor(null)}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Box>
      )}
    </Box>
  );
};
