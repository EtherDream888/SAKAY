import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Rating,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import FeedbackIcon from '@mui/icons-material/Feedback';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';

import { FilterToolbar, FilterOption } from '../components/admin/FilterToolbar';
import { fetchPassengerFeedback, PassengerFeedbackItem } from '../services/adminApiService';

/**
 * ============================================================================
 * PASSENGER FEEDBACK & RATINGS PAGE (PassengerFeedbackPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● Review Passenger Feedback
 *     ○ View ratings
 *     ○ View passenger feedback
 *     ○ Review complaints
 * ============================================================================
 */
export const PassengerFeedbackPage: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<PassengerFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPassengerFeedback();
      setFeedbackList(data);
    } catch (err) {
      console.error('[PassengerFeedbackPage] Error loading feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const filteredFeedback = feedbackList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.passengerName.toLowerCase().includes(q) ||
      item.driverName.toLowerCase().includes(q) ||
      item.todaName.toLowerCase().includes(q) ||
      item.comment.toLowerCase().includes(q);

    let matchesRating = true;
    if (ratingFilter === '5') matchesRating = item.ratingValue === 5;
    if (ratingFilter === '4') matchesRating = item.ratingValue === 4;
    if (ratingFilter === '3') matchesRating = item.ratingValue === 3;
    if (ratingFilter === 'Complaints') matchesRating = item.ratingValue <= 2 || item.isComplaint;

    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

    return matchesSearch && matchesRating && matchesCategory;
  });

  const totalReviews = feedbackList.length;
  const avgRating =
    totalReviews > 0
      ? (feedbackList.reduce((sum, f) => sum + f.ratingValue, 0) / totalReviews).toFixed(1)
      : '5.0';
  const complaintsCount = feedbackList.filter((f) => f.ratingValue <= 2 || f.isComplaint).length;
  const fiveStarCount = feedbackList.filter((f) => f.ratingValue === 5).length;

  const ratingOptions: FilterOption[] = [
    { label: 'All Ratings', value: 'All' },
    { label: '5 Stars (Excellent)', value: '5' },
    { label: '4 Stars (Good)', value: '4' },
    { label: '3 Stars (Average)', value: '3' },
    { label: 'Complaints (<= 2 Stars)', value: 'Complaints' },
  ];

  const categoryOptions: FilterOption[] = [
    { label: 'All Categories', value: 'All' },
    { label: 'Cleanliness', value: 'Cleanliness' },
    { label: 'Courtesy', value: 'Courtesy' },
    { label: 'Safe Driving', value: 'Safe Driving' },
    { label: 'Fair Pricing', value: 'Fair Pricing' },
    { label: 'General', value: 'General' },
  ];

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Overall Commuter Rating
              </Typography>
              <StarIcon sx={{ color: '#FBBC04', fontSize: '17.6' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              ⭐ {avgRating} / 5.0
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              From {totalReviews} passenger evaluations
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                5-Star Commendations
              </Typography>
              <StarIcon sx={{ color: '#2E7D32', fontSize: '17.6' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#2E7D32', mb: 0.5 }}>
              {fiveStarCount}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Excellent driver reviews
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Critical Complaints
              </Typography>
              <WarningAmberIcon sx={{ color: '#DC2626', fontSize: '17.6' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#DC2626', mb: 0.5 }}>
              {complaintsCount}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Low ratings (&le;2 stars) for review
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
                Total Feedback Records
              </Typography>
              <FeedbackIcon sx={{ color: 'var(--sakay-orange)', fontSize: '17.6' }} />
            </Box>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--sakay-orange)', mb: 0.5 }}>
              {totalReviews}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Total passenger reviews
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 2. Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search feedback comments, passenger, driver, or TODA..."
        selectFilters={[
          {
            id: 'rating',
            label: 'Star Rating',
            value: ratingFilter,
            options: ratingOptions,
            onChange: setRatingFilter,
          },
          {
            id: 'category',
            label: 'Category',
            value: categoryFilter,
            options: categoryOptions,
            onChange: setCategoryFilter,
          },
        ]}
        onResetFilters={() => {
          setSearchQuery('');
          setRatingFilter('All');
          setCategoryFilter('All');
        }}
      />

      {/* 3. Feedback Data Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                PASSENGER & DATE
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                EVALUATED DRIVER & TODA
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                RATING & CATEGORY
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '10.4px', color: 'var(--mac-text-muted)', py: 2, px: 3 }}>
                PASSENGER FEEDBACK COMMENT
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
                  <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-muted)' }}>
                    Loading passenger feedback...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredFeedback.length > 0 ? (
              filteredFeedback.map((item) => (
                <TableRow
                  key={item.id}
                  sx={{
                    transition: 'var(--mac-transition-fast)',
                    '&:hover': { backgroundColor: 'var(--mac-canvas-bg)' },
                  }}
                >
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '11.6px', color: 'var(--mac-text-primary)' }}>
                      {item.passengerName}
                    </Typography>
                    <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)', mt: '2px' }}>
                      {item.createdAt}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '11.3px', color: 'var(--mac-text-primary)' }}>
                      {item.driverName}
                    </Typography>
                    <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
                      {item.todaName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={item.ratingValue} readOnly size="small" />
                      <Typography sx={{ fontSize: '10.4px', fontWeight: 700 }}>
                        {item.ratingValue}.0
                      </Typography>
                    </Box>
                    <Box sx={{ mt: '4px' }}>
                      <Chip
                        label={item.category}
                        size="small"
                        sx={{ fontSize: '8.8px', fontWeight: 600, height: 22 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 2.2, px: 3 }}>
                    <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-primary)', fontStyle: 'italic' }}>
                      "{item.comment}"
                    </Typography>
                    {item.isComplaint && (
                      <Typography sx={{ fontSize: '9.3px', color: '#DC2626', fontWeight: 700, mt: '4px' }}>
                        ⚠️ Flagged for Triage Officer Attention
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <FeedbackIcon sx={{ fontSize: '35.3', color: 'var(--mac-border-color)' }} />
                    <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                      No passenger feedback records found
                    </Typography>
                    <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', maxWidth: 420 }}>
                      {searchQuery || ratingFilter !== 'All'
                        ? 'No feedback entries match your search criteria.'
                        : 'There are currently no passenger feedback or rating records.'}
                    </Typography>
                    <Button
                      onClick={loadFeedback}
                      startIcon={<RefreshIcon />}
                      sx={{
                        mt: 1,
                        textTransform: 'none',
                        fontSize: '10.8px',
                        color: 'var(--sakay-orange)',
                        fontWeight: 600,
                      }}
                    >
                      Refresh
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

