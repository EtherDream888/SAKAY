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
  Tab,
  Tabs,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface FeedbackItem {
  id: string;
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

  const booking = (location.state as { booking?: any })?.booking;
  const driverName = booking?.driver_name || 'Aurelio Bautista';
  const franchiseNo = booking?.franchise_no || 'CAL-2025-0773';
  const todaName = booking?.toda_name || 'Calapan Central TODA';

  const [tab, setTab] = useState<0 | 1>(0); // 0: Submit, 1: Past Feedback
  const [rating, setRating] = useState<number | null>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Magalang na Driver', 'Ligtas Magmaneho']);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const availableTags = [
    'Magalang na Driver',
    'Ligtas Magmaneho',
    'Malinis na Tricycle',
    'Tamang Sukli',
    'Maagap at Mabilis',
    'Maingat sa Daan',
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitFeedback = () => {
    const newFeedback: FeedbackItem = {
      id: `FB-${Date.now()}`,
      driverName,
      franchiseNo,
      todaName,
      rating: rating || 5,
      tags: selectedTags,
      comment: comment.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const history = raw ? JSON.parse(raw) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newFeedback, ...history]));
    } catch {
      // ignore
    }

    setSubmitted(true);
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1500);
  };

  const getPastFeedback = (): FeedbackItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [
        {
          id: 'FB-001',
          driverName: 'Pedro Penduko',
          franchiseNo: 'CAL-2025-0088',
          todaName: 'Calapan Central TODA',
          rating: 5,
          tags: ['Magalang na Driver', 'Ligtas Magmaneho'],
          comment: 'Napakabait po ng driver at maingat sa lubak.',
          date: 'Aug 12, 2026',
        }
      ];
    } catch {
      return [];
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ padding: 'calc(var(--safe-area-top) + 16px) 20px 12px', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
        <IconButton onClick={() => navigate('/dashboard', { replace: true })} sx={{ color: '#0F172A' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
          Puna at Rating (Feedback)
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ backgroundColor: '#FFFFFF', px: 2, borderBottom: '1px solid #E2E8F0' }}>
        <Tabs value={tab} onChange={(_, val) => setTab(val)} textColor="inherit" indicatorColor="primary">
          <Tab label="I-rate ang Biyahe" sx={{ fontWeight: 700, textTransform: 'none' }} />
          <Tab label="Mga Nakaraang Rating" sx={{ fontWeight: 700, textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tab === 0 ? (
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Driver Card */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, backgroundColor: '#FF6B00', fontWeight: 800, fontSize: '22px', margin: '0 auto 12px auto' }}>
              {driverName.charAt(0)}
            </Avatar>
            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              {driverName}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>
              Franchise #{franchiseNo} • {todaName}
            </Typography>

            {/* Star Rating Picker */}
            <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                Kamusta ang inyong naging biyahe?
              </Typography>
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue)}
                size="large"
                sx={{ color: '#FF6B00', fontSize: '36px' }}
              />
            </Box>
          </Paper>

          {/* Compliment Tags */}
          <Box>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mb: 1 }}>
              Mga Papuri at Katangian (Compliments)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    clickable
                    onClick={() => handleToggleTag(tag)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '12px',
                      backgroundColor: isSelected ? '#FFF8F0' : '#FFFFFF',
                      color: isSelected ? '#FF6B00' : '#475569',
                      border: isSelected ? '1.5px solid #FF6B00' : '1px solid #E2E8F0',
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Written Feedback */}
          <Box>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', mb: 1 }}>
              Karagdagang Komento (Optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Ibahagi ang iyong opinyon tungkol sa serbisyo..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ backgroundColor: '#FFFFFF', '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
            />
          </Box>

          {submitted ? (
            <Paper sx={{ p: 2, borderRadius: '14px', backgroundColor: '#E6F4EA', border: '1px solid #A7F3D0', textAlign: 'center' }}>
              <Typography sx={{ color: '#1E8E3E', fontWeight: 800 }}>
                ✓ Maraming salamat sa iyong rating at suporta sa TODA!
              </Typography>
            </Paper>
          ) : (
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmitFeedback}
              sx={{
                height: 52,
                borderRadius: '16px',
                backgroundColor: '#FF6B00',
                fontWeight: 800,
                fontSize: '15px',
                '&:hover': { backgroundColor: '#E66000' },
              }}
            >
              Isumite ang Rating (Submit Feedback)
            </Button>
          )}
        </Box>
      ) : (
        /* Past Feedback History */
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {getPastFeedback().map((item) => (
            <Paper key={item.id} elevation={0} sx={{ p: 2, borderRadius: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{item.driverName}</Typography>
                <Rating value={item.rating} readOnly size="small" sx={{ color: '#FF6B00' }} />
              </Box>
              <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>Franchise #{item.franchiseNo} • {item.date}</Typography>
              {item.comment && (
                <Typography sx={{ fontSize: '13px', color: '#334155', mt: 1, fontStyle: 'italic' }}>
                  "{item.comment}"
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {item.tags.map((t, idx) => (
                  <Chip key={idx} label={t} size="small" sx={{ fontSize: '10.5px', backgroundColor: '#F1F5F9' }} />
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};
