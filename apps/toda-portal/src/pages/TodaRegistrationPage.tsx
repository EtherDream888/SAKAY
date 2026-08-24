import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

import { registerToda, resubmitTodaApplication } from '../services/todaApiService';

/**
 * ============================================================================
 * TODA REGISTRATION & ACCREDITATION SUBMISSION PAGE (TodaRegistrationPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● Register TODA
 *     ○ Fill out TODA registration form
 *     ○ Submit TODA information
 *     ○ Upload required documents
 *     ○ Correct and resubmit TODA application
 * ============================================================================
 */
export const TodaRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [todaName, setTodaName] = useState('');
  const [todaAcronym, setTodaAcronym] = useState('');
  const [barangay, setBarangay] = useState('San Vicente Central');
  const [dateEstablished, setDateEstablished] = useState('2024-01-15');
  const [serviceCoverageArea, setServiceCoverageArea] = useState('Calapan Public Market, J.P. Rizal St., Provincial Capitol');
  const [presidentName, setPresidentName] = useState('');
  const [presidentContact, setPresidentContact] = useState('');
  const [vicePresidentName, setVicePresidentName] = useState('');
  const [vicePresidentContact, setVicePresidentContact] = useState('');
  const [secretaryName, setSecretaryName] = useState('');
  const [secretaryContact, setSecretaryContact] = useState('');
  const [treasurerName, setTreasurerName] = useState('');
  const [treasurerContact, setTreasurerContact] = useState('');

  // Uploaded documents checklist
  const [docs, setDocs] = useState<{ [key: string]: boolean }>({
    barangayClearance: false,
    secCda: false,
    masterRoster: false,
    mayorPermit: false,
  });

  const handleToggleDoc = (key: string) => {
    setDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todaName.trim() || !presidentName.trim() || !presidentContact.trim()) {
      setErrorMsg('Please fill in all required fields marked with *');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await registerToda({
        todaName: todaName.trim(),
        todaAcronym: todaAcronym.trim() || todaName.slice(0, 4).toUpperCase(),
        barangay,
        dateEstablished,
        serviceCoverageArea,
        presidentName: presidentName.trim(),
        presidentContact: presidentContact.trim(),
        vicePresidentName: vicePresidentName.trim(),
        vicePresidentContact: vicePresidentContact.trim(),
        secretaryName: secretaryName.trim(),
        secretaryContact: secretaryContact.trim(),
        treasurerName: treasurerName.trim(),
        treasurerContact: treasurerContact.trim(),
      });

      setSuccessMsg(`TODA Accreditation Application for "${todaName}" successfully submitted to the City LGU Transport Board!`);
      setTimeout(() => {
        navigate('/account');
      }, 2500);
    } catch (err) {
      console.error('[TodaRegistrationPage] Submission error:', err);
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', py: 4, px: 3 }}>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, textTransform: 'none', color: 'var(--mac-text-secondary)', fontWeight: 600 }}
      >
        Back to Portal
      </Button>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 'var(--mac-radius-lg)',
          border: '1px solid var(--mac-border-color)',
          boxShadow: 'var(--mac-shadow-card)',
          p: 4,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: 'var(--sakay-orange-soft)',
              color: 'var(--sakay-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssignmentIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '22px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
              TODA Association Accreditation Form
            </Typography>
            <Typography sx={{ fontSize: '13.5px', color: 'var(--mac-text-muted)', mt: '2px' }}>
              Calapan City Local Government Unit • Franchising and Regulatory Board
            </Typography>
          </Box>
        </Box>

        {successMsg && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMsg}
          </Alert>
        )}

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Association Information */}
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.3px' }}>
            1. Association Profile & Operating Area
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2.5, mb: 3 }}>
            <TextField
              label="Official TODA Name *"
              value={todaName}
              onChange={(e) => setTodaName(e.target.value)}
              placeholder="e.g. Calapan Central TODA"
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Association Acronym"
              value={todaAcronym}
              onChange={(e) => setTodaAcronym(e.target.value)}
              placeholder="e.g. CCTODA"
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
            <TextField
              select
              label="Operating Barangay Service Area *"
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="San Vicente Central">San Vicente Central</MenuItem>
              <MenuItem value="Lumangbayan">Lumangbayan</MenuItem>
              <MenuItem value="Balite">Balite</MenuItem>
              <MenuItem value="Ibaba">Ibaba</MenuItem>
              <MenuItem value="Suqui">Suqui</MenuItem>
              <MenuItem value="Ilaya">Ilaya</MenuItem>
              <MenuItem value="Balingayan">Balingayan</MenuItem>
            </TextField>

            <TextField
              label="Date Established"
              type="date"
              value={dateEstablished}
              onChange={(e) => setDateEstablished(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              size="small"
            />
          </Box>

          <TextField
            label="Designated Service Coverage Corridor / Terminal Location *"
            value={serviceCoverageArea}
            onChange={(e) => setServiceCoverageArea(e.target.value)}
            placeholder="List main roads, terminals, and public market boundaries..."
            fullWidth
            size="small"
            sx={{ mb: 4 }}
          />

          {/* Section 2: Executive Officers Roster */}
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.3px' }}>
            2. Authorized Executive Officers Roster (4 Required Officers)
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
            <TextField
              label="President Full Name *"
              value={presidentName}
              onChange={(e) => setPresidentName(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="President Mobile Contact *"
              value={presidentContact}
              onChange={(e) => setPresidentContact(e.target.value)}
              required
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
            <TextField
              label="Vice President Name"
              value={vicePresidentName}
              onChange={(e) => setVicePresidentName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Vice President Contact"
              value={vicePresidentContact}
              onChange={(e) => setVicePresidentContact(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
            <TextField
              label="Secretary Name"
              value={secretaryName}
              onChange={(e) => setSecretaryName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Secretary Contact"
              value={secretaryContact}
              onChange={(e) => setSecretaryContact(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 4 }}>
            <TextField
              label="Treasurer Name"
              value={treasurerName}
              onChange={(e) => setTreasurerName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Treasurer Contact"
              value={treasurerContact}
              onChange={(e) => setTreasurerContact(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>

          {/* Section 3: Required Accreditation Documents */}
          <Typography sx={{ fontSize: '14px', fontWeight: 700, color: 'var(--sakay-orange)', textTransform: 'uppercase', mb: 2, letterSpacing: '0.3px' }}>
            3. Upload Required Accreditation Documents
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            {[
              { key: 'barangayClearance', label: 'Barangay Clearance (Endorsed by Barangay Captain)' },
              { key: 'secCda', label: 'SEC or CDA Certificate of Registration' },
              { key: 'masterRoster', label: 'Official Master Driver Roster & Unit Ledger' },
              { key: 'mayorPermit', label: "Mayor's Permit & Franchise Clearance" },
            ].map((item) => (
              <Box
                key={item.key}
                onClick={() => handleToggleDoc(item.key)}
                sx={{
                  cursor: 'pointer',
                  p: '16px 20px',
                  borderRadius: '10px',
                  border: docs[item.key] ? '1.5px solid #2E7D32' : '1px dashed var(--mac-border-color)',
                  backgroundColor: docs[item.key] ? '#F0FDF4' : '#FAFAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CloudUploadIcon sx={{ color: docs[item.key] ? '#2E7D32' : 'var(--mac-text-muted)' }} />
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--mac-text-primary)' }}>
                    {item.label}
                  </Typography>
                </Box>
                <Chip
                  label={docs[item.key] ? 'Attached ✓' : 'Click to Attach File'}
                  size="small"
                  color={docs[item.key] ? 'success' : 'default'}
                  sx={{ fontWeight: 600, fontSize: '12px' }}
                />
              </Box>
            ))}
          </Box>

          {/* Submit Action */}
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="contained"
            fullWidth
            sx={{
              py: 1.5,
              fontSize: '15px',
              fontWeight: 700,
              backgroundColor: 'var(--sakay-orange)',
              textTransform: 'none',
              borderRadius: '10px',
              boxShadow: 'var(--mac-shadow-button)',
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Submit Accreditation Application to LGU'
            )}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};
