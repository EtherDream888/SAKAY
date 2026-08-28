import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { parseDriverRoster, DriverRosterRow } from '../../utils/rosterParser';

interface DocumentReviewModalProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
  fileName: string | null;
  fileUrl: string | null;
  fileObj?: File | null;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  open,
  onClose,
  documentTitle,
  fileName,
  fileUrl,
  fileObj,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<DriverRosterRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const extension = (fileName || fileUrl || '').split('.').pop()?.toLowerCase() || '';
  const isSpreadsheet = ['csv', 'xlsx', 'xls'].includes(extension);
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension);
  const isPdf = extension === 'pdf';

  useEffect(() => {
    if (!open) {
      setTableData([]);
      setError(null);
      setSearchQuery('');
      return;
    }

    if (isSpreadsheet) {
      parseSpreadsheet();
    }
  }, [open, fileUrl, fileObj, fileName]);

  const parseSpreadsheet = async () => {
    setLoading(true);
    setError(null);

    try {
      const source = fileObj || fileUrl;
      if (!source) {
        throw new Error('No document data available to preview.');
      }

      const { rows } = await parseDriverRoster(source);
      setTableData(rows);
    } catch (err: any) {
      console.error('[DocumentReviewModal] Parsing error:', err);
      setError(err.message || 'Unable to parse spreadsheet contents.');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = tableData.filter((row) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.name.toLowerCase().includes(q) ||
      row.franchiseNumber.toLowerCase().includes(q) ||
      String(row.no).includes(q)
    );
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.16)',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: '16px 20px',
          borderBottom: '1px solid var(--mac-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFC',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isSpreadsheet ? (
            <TableChartOutlinedIcon sx={{ color: '#16A34A', fontSize: 24 }} />
          ) : isPdf ? (
            <PictureAsPdfOutlinedIcon sx={{ color: '#DC2626', fontSize: 24 }} />
          ) : isImage ? (
            <ImageOutlinedIcon sx={{ color: 'var(--sakay-orange)', fontSize: 24 }} />
          ) : (
            <InsertDriveFileOutlinedIcon sx={{ color: '#64748B', fontSize: 24 }} />
          )}

          <Box>
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              {fileName || documentTitle}
            </Typography>
            {fileName && fileName !== documentTitle && (
              <Typography sx={{ fontSize: '12px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                {documentTitle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {fileUrl && (
            <Button
              size="small"
              variant="text"
              startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
              onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
              sx={{
                textTransform: 'none',
                color: 'var(--sakay-orange)',
                fontSize: '12.5px',
                fontWeight: 600,
                px: 1,
              }}
            >
              Open in New Window
            </Button>
          )}

          <IconButton size="small" onClick={onClose} sx={{ color: '#64748B' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 2.5, flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC' }}>
        {/* SPREADSHEET TABLE PREVIEW */}
        {isSpreadsheet && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    backgroundColor: 'var(--sakay-orange-soft)',
                    border: '1px solid var(--sakay-orange-border)',
                  }}
                >
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    Number of Drivers:
                  </Typography>
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: 'var(--sakay-orange)' }}>
                    {tableData.length}
                  </Typography>
                </Box>
              </Box>

              <TextField
                size="small"
                placeholder="Search driver name or franchise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: '12.5px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      width: { xs: '100%', sm: 260 },
                    },
                  },
                }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 1.5 }}>
                <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)' }} />
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)', fontWeight: 500 }}>
                  Parsing spreadsheet data...
                </Typography>
              </Box>
            ) : error ? (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                {error}
              </Alert>
            ) : tableData.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '10px', backgroundColor: '#FFFFFF' }}>
                <Typography sx={{ fontSize: '13px', color: 'var(--mac-text-muted)' }}>
                  No data rows could be extracted from this spreadsheet.
                </Typography>
              </Paper>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderRadius: '10px',
                  maxHeight: '52vh',
                  boxShadow: 'none',
                  borderColor: 'var(--mac-border-color)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          width: '70px',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          backgroundColor: '#F1F5F9',
                          color: 'var(--mac-text-primary)',
                          borderBottom: '2px solid #E2E8F0',
                        }}
                      >
                        No.
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          fontSize: '12.5px',
                          backgroundColor: '#F1F5F9',
                          color: 'var(--mac-text-primary)',
                          borderBottom: '2px solid #E2E8F0',
                        }}
                      >
                        Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          fontSize: '12.5px',
                          backgroundColor: '#F1F5F9',
                          color: 'var(--mac-text-primary)',
                          borderBottom: '2px solid #E2E8F0',
                        }}
                      >
                        Franchise Number
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.map((row, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        sx={{
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFC',
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                          {row.no}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12.5px', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                          {row.name}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12.5px', color: '#334155', fontWeight: 500 }}>
                          <Chip
                            label={row.franchiseNumber}
                            size="small"
                            sx={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              height: 22,
                              backgroundColor: 'var(--sakay-orange-soft)',
                              color: 'var(--sakay-orange)',
                              border: '1px solid var(--sakay-orange-border)',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* IMAGE PREVIEW */}
        {isImage && fileUrl && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              p: 2,
              borderRadius: '12px',
              border: '1px solid var(--mac-border-color)',
              minHeight: 350,
            }}
          >
            <Box
              component="img"
              src={fileUrl}
              alt={fileName || documentTitle}
              sx={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              }}
            />
          </Box>
        )}

        {/* PDF PREVIEW */}
        {isPdf && fileUrl && (
          <Box
            sx={{
              width: '100%',
              height: '65vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--mac-border-color)',
            }}
          >
            <iframe
              src={fileUrl}
              title={fileName || documentTitle}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          p: '12px 20px',
          borderTop: '1px solid var(--mac-border-color)',
          backgroundColor: '#FAFAFC',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: 'none',
            backgroundColor: 'var(--sakay-orange)',
            fontWeight: 600,
            fontSize: '13px',
            borderRadius: '8px',
            px: 2.5,
            '&:hover': {
              backgroundColor: '#E05A00',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
