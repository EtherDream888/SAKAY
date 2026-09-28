import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Rating,
  Chip,
  TextField,
  Avatar,
  Dialog,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { supabase } from '../../../services/supabaseClient';
import { useLanguage } from '../../../utils/LanguageContext';

interface FeedbackItem {
  id: string;
  booking_id?: string;
  driverName: string;
  franchiseNo: string;
  todaName: string;
  rating: number;
  tags: string[];
  comment: string;
  date: string;
}

const STORAGE_KEY = 'sakay_passenger_feedback_history';

export const PassengerFeedback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const booking = (location.state as { booking?: any })?.booking;
  const driverName = booking?.driver_name || 'Aurelio Bautista';
  const franchiseNo = booking?.franchise_no || 'CAL-2025-0773';
  const todaName = booking?.toda_name || 'Calapan Central TODA';

  const [rating, setRating] = useState<number | null>(null);
  // RATING CHOICES MUST START UNSELECTED
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // OPTIONAL TEXT FEEDBACK MUST START EMPTY
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thankYouModalOpen, setThankYouModalOpen] = useState(false);

  // Clear active ongoing booking session since trip is completed
  React.useEffect(() => {
    sessionStorage.removeItem('current_active_booking_id');
    sessionStorage.removeItem('trip_dropoff');
    sessionStorage.removeItem('trip_pickup');
    sessionStorage.removeItem('trip_notes');
  }, []);

  const handleReturnToDashboard = () => {
    sessionStorage.removeItem('current_active_booking_id');
    sessionStorage.removeItem('trip_dropoff');
    sessionStorage.removeItem('trip_pickup');
    sessionStorage.removeItem('trip_notes');
    navigate('/dashboard', { replace: true });
  };

  // RATING STATE MUST BE SAVED AND LOADED CORRECTLY
  React.useEffect(() => {
    let isMounted = true;
    const checkExistingRating = async () => {
      if (booking?.booking_id) {
        try {
          const { data } = await supabase
            .from('rating')
            .select('*')
            .eq('booking_id', booking.booking_id)
            .eq('rater_role', 'Passenger')
            .maybeSingle();

          if (data && isMounted) {
            setRating(data.stars);
            setSelectedTags(Array.isArray(data.tags) ? data.tags : []);
            setComment(data.comment || '');
            setSubmitted(true);
            return;
          }
        } catch (err) {
          console.warn('[PassengerFeedback] DB check error:', err);
        }
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const history = JSON.parse(raw);
          const found = history.find(
            (fb: any) =>
              booking?.booking_id && fb.booking_id === booking.booking_id
          );
          if (found && isMounted) {
            setRating(found.rating || found.stars || null);
            setSelectedTags(found.tags || []);
            setComment(found.comment || '');
            setSubmitted(true);
          }
        }
      } catch {
        // ignore
      }
    };

    checkExistingRating();
    return () => {
      isMounted = false;
    };
  }, [booking?.booking_id, driverName]);


  const availableTags = language === 'tl' ? [
    'Magalang na Driver',
    'Ligtas Magmaneho',
    'Malinis na Tricycle',
    'Tamang Sukli',
    'Maagap at Mabilis',
    'Maingat sa Daan',
  ] : [
    'Courteous Driver',
    'Safe Driving',
    'Clean Tricycle',
    'Correct Change',
    'Prompt & Fast',
    'Careful on the Road',
  ];

  const handleToggleTag = (tag: string) => {
    if (submitted) return;
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!rating) return;
    setSubmitting(true);
    setSubmitError(null);

    // Requirement 4: Truly optional - empty becomes NULL
    const cleanComment = comment.trim() ? comment.trim() : null;

    const newFeedback: FeedbackItem = {
      id: `FB-${Date.now()}`,
      booking_id: booking?.booking_id,
      driverName,
      franchiseNo,
      todaName,
      rating: rating,
      tags: selectedTags,
      comment: cleanComment || '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    try {
      const isUuid = (str: any) =>
        typeof str === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      if (isUuid(booking?.booking_id) && isUuid(booking?.passenger_id) && isUuid(booking?.driver_id)) {
        const { error } = await supabase.from('rating').upsert(
          [
            {
              booking_id: booking.booking_id,
              rater_id: booking.passenger_id,
              ratee_id: booking.driver_id,
              rater_role: 'Passenger',
              stars: rating,
              tags: selectedTags,
              comment: cleanComment,
              created_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'booking_id,rater_role' }
        );

        if (error) {
          console.warn('[PassengerFeedback] Supabase upsert note:', error);
        }
      }
    } catch (err) {
      console.warn('[PassengerFeedback] DB insert note:', err);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      const filtered = history.filter(
        (fb: any) => !(booking?.booking_id && fb.booking_id === booking.booking_id)
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newFeedback, ...filtered]));
    } catch {
      // ignore
    }

    setSubmitting(false);
    setSubmitted(true);
    setThankYouModalOpen(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Requirement 1: Top Header with Right-Aligned Contact Support */}
      <Box
        sx={{
          paddingTop: 'calc(var(--safe-area-top) + 12px)',
          paddingBottom: '12px',
          paddingX: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={handleReturnToDashboard}
          sx={{
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            width: 40,
            height: 40,
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Button
          onClick={() => navigate('/support')}
          sx={{
            color: '#FF6B00',
            fontWeight: 700,
            fontSize: '13.5px',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            borderRadius: '10px',
            px: 1.5,
            py: 0.5,
            '&:hover': { backgroundColor: '#FFF7ED' },
          }}
        >
          {language === 'tl' ? 'Sumangguni sa Support' : 'Contact Support'}
        </Button>
      </Box>

      {/* Main Form Content */}
      <Box
        className="hide-scrollbar"
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {submitError && (
          <Alert severity="warning" onClose={() => setSubmitError(null)} sx={{ borderRadius: '14px' }}>
            {submitError}
          </Alert>
        )}

        {/* Driver Card */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Avatar sx={{ width: 64, height: 64, backgroundColor: '#FF6B00', fontWeight: 800, fontSize: '22px', margin: '0 auto 12px auto' }}>
            {driverName.charAt(0)}
          </Avatar>
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: 'Poppins, sans-serif' }}>
            {driverName}
          </Typography>
          <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontFamily: 'Poppins, sans-serif' }}>
            Franchise #{franchiseNo} • {todaName}
          </Typography>

          {/* Star Rating Picker */}
          <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#475569', fontFamily: 'Poppins, sans-serif' }}>
              {language === 'tl' ? 'Kamusta ang inyong naging biyahe?' : 'How was your trip?'}
            </Typography>
            <Rating
              value={rating}
              readOnly={submitted}
              onChange={(_, newValue) => !submitted && setRating(newValue)}
              size="large"
              sx={{ color: '#FF6B00', fontSize: '38px' }}
            />
          </Box>
        </Paper>

        {/* Compliment Tags */}
        <Box>
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mb: 1, letterSpacing: '0.5px', fontFamily: 'Poppins, sans-serif' }}>
            {language === 'tl' ? 'Mga Papuri at Katangian (Compliments)' : 'Compliments & Badges'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              if (submitted && !isSelected) return null; // Hide unselected tags when viewing submitted rating
              return (
                <Chip
                  key={tag}
                  label={tag}
                  clickable={!submitted}
                  onClick={() => handleToggleTag(tag)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '12.5px',
                    fontFamily: 'Poppins, sans-serif',
                    backgroundColor: isSelected ? '#FFF8F0' : '#FFFFFF',
                    color: isSelected ? '#FF6B00' : '#475569',
                    border: isSelected ? '1.5px solid #FF6B00' : '1px solid #E2E8F0',
                    py: 0.5,
                  }}
                />
              );
            })}
          </Box>
        </Box>

        {/* Written Feedback (Optional) */}
        <Box>
          <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mb: 1, letterSpacing: '0.5px', fontFamily: 'Poppins, sans-serif' }}>
            {language === 'tl' ? 'Karagdagang Komento (Optional)' : 'Additional Comments (Optional)'}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3.5}
            disabled={submitted}
            placeholder={language === 'tl' ? 'Ibahagi ang iyong opinyon tungkol sa serbisyo...' : 'Share your thoughts about the service...'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ backgroundColor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
          />
        </Box>
      </Box>

      {/* Pinned Bottom Submit Button */}
      <Box sx={{ p: 2, borderTop: '1px solid #F1F5F9', backgroundColor: '#FFFFFF', flexShrink: 0, pb: 'calc(var(--safe-area-bottom) + 16px)' }}>
        {submitted ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', backgroundColor: '#E6F4EA', border: '1px solid #A7F3D0', textAlign: 'center' }}>
            <Typography sx={{ color: '#1E8E3E', fontWeight: 800, fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}>
              {language === 'tl' ? '✓ Naitala na ang iyong rating. Maraming salamat!' : '✓ Your rating has been saved. Thank you!'}
            </Typography>
          </Paper>
        ) : (
          <Button
            variant="contained"
            fullWidth
            disabled={submitting || !rating}
            onClick={handleSubmitFeedback}
            sx={{
              height: 52,
              borderRadius: '16px',
              backgroundColor: '#FF6B00',
              fontWeight: 800,
              fontSize: '15px',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              boxShadow: '0 4px 14px rgba(255, 107, 0, 0.3)',
              '&:hover': { backgroundColor: '#E66000' },
              '&.Mui-disabled': { backgroundColor: '#FFB380', color: '#FFFFFF' },
            }}
          >
            {submitting ? (
              <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
            ) : language === 'tl' ? (
              'Isumite ang Feedback'
            ) : (
              'Submit Feedback'
            )}
          </Button>
        )}
      </Box>

      {/* Thank You Popup Modal */}
      <Dialog
        open={thankYouModalOpen}
        onClose={handleReturnToDashboard}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '28px',
              p: 3,
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 25px 50px rgba(0,0,0,0.18)',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, mt: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: '#10B981' }} />
        </Box>

        <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', fontFamily: 'Poppins, sans-serif', mb: 1, lineHeight: 1.3 }}>
          {language === 'tl'
            ? '🎉 Maraming Salamat sa Pagbiyahe Kasama ang SAKAY!'
            : '🎉 Thank You for Riding with SAKAY!'}
        </Typography>

        <Typography sx={{ fontSize: '13px', color: '#64748B', fontFamily: 'Poppins, sans-serif', mb: 3, px: 1, lineHeight: 1.5 }}>
          {language === 'tl'
            ? 'Ang iyong feedback ay malaking tulong sa pagpapanatili ng ligtas, maayos, at makatarungang biyahe sa buong Calapan City.'
            : 'Your feedback helps us ensure safe, reliable, and fair tricycle transportation across Calapan City.'}
        </Typography>

        <Button
          variant="contained"
          fullWidth
          onClick={handleReturnToDashboard}
          sx={{
            height: '52px',
            borderRadius: '16px',
            backgroundColor: '#FF6B00',
            fontWeight: 800,
            fontSize: '15px',
            textTransform: 'none',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 4px 14px rgba(255, 107, 0, 0.3)',
            '&:hover': { backgroundColor: '#E66000' },
          }}
        >
          {language === 'tl' ? 'Bumalik sa Dashboard' : 'Return to Dashboard'}
        </Button>
      </Dialog>
    </Box>
  );
};

export default PassengerFeedback;
