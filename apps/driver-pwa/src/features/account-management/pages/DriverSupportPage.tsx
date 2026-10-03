import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhoneIcon from '@mui/icons-material/Phone';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

import { EXEMPTION_REQUEST_WINDOW_HOURS, STRIKE_LADDER, STRIKE_WINDOW_DAYS } from '@sakay/shared';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';

import PageHeader from '../../../common/components/PageHeader';
import { useLanguage } from '../../../utils/LanguageContext';

const FAQS_TL = [
  {
    q: 'Paano kinakalkula ang taripa ng drayber sa SAKAY?',
    a: 'Ang pamasahe ay batay sa opisyal na Calapan City TODA Fare Matrix. Sa Solo Ride, ang base fare na ₱15 ay minumultiplicar sa 4 (kabuuang ₱60) dagdag ang karagdagang distansya.',
  },
  {
    q: 'Ano ang gagawin kapag may hindi nagbayad na pasahero o may insidente?',
    a: 'Maaari kayong makipag-ugnayan agad sa inyong TODA Administrator o sa Calapan Transport Hotline gamit ang call button sa itaas.',
  },
  {
    q: 'Paano gumagana ang Strike system para sa mga drayber?',
    a: `Ang mga strike ay naiipon sa loob ng ${STRIKE_WINDOW_DAYS} araw kapag may napatunayang paglabag sa taripa o alituntunin. Sa ${STRIKE_LADDER.ADMIN_REVIEW_AT} strike, may administrative review; sa ${STRIKE_LADDER.SUSPENSION_1_AT} strike, ${STRIKE_LADDER.SUSPENSION_1_DAYS}-araw na suspensyon; sa ${STRIKE_LADDER.SUSPENSION_2_AT} strike, ${STRIKE_LADDER.SUSPENSION_2_DAYS}-araw na suspensyon; sa ${STRIKE_LADDER.DEACTIVATION_AT} strike, isasailalim sa permanent deactivation review ng LGU. May ${EXEMPTION_REQUEST_WINDOW_HOURS} oras kayo para humiling ng exemption.`,
  },
  {
    q: 'Ano ang kailangan kapag magpapalit ng nakarehistrong traysikel o lisensya?',
    a: 'Pumunta sa inyong TODA Officer upang ma-update ang inyong dokumento sa SAKAY system.',
  },
];

const FAQS_EN = [
  {
    q: 'How are driver tariffs calculated in SAKAY?',
    a: 'Fares strictly follow the Official Calapan City TODA Fare Matrix. Solo Trip rides charge a base fare of ₱15 multiplied by 4 (total ₱60 for full vehicle) plus distance fare.',
  },
  {
    q: 'What should I do if a passenger refuses to pay or in case of incident?',
    a: 'Immediately contact your TODA Administrator or the Calapan Transport Hotline using the quick call button above.',
  },
  {
    q: 'How does the Strike system work for drivers?',
    a: `Strikes accumulate over a rolling ${STRIKE_WINDOW_DAYS} days on verified violations. ${STRIKE_LADDER.ADMIN_REVIEW_AT} strikes trigger an administrative review; ${STRIKE_LADDER.SUSPENSION_1_AT} strikes a ${STRIKE_LADDER.SUSPENSION_1_DAYS}-day suspension; ${STRIKE_LADDER.SUSPENSION_2_AT} strikes a ${STRIKE_LADDER.SUSPENSION_2_DAYS}-day suspension; ${STRIKE_LADDER.DEACTIVATION_AT} strikes lead to permanent LGU deactivation review. You have ${EXEMPTION_REQUEST_WINDOW_HOURS} hours to request an exemption.`,
  },
  {
    q: 'How do I update my vehicle or driver license details?',
    a: 'Contact your TODA Administrator to upload updated documents into the SAKAY system.',
  },
];

export const DriverSupportPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | false>(false);

  const isTagalog = language === 'tl';
  const faqs = isTagalog ? FAQS_TL : FAQS_EN;

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FAFAFA',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageHeader
        title={isTagalog ? 'Tulong at Suporta' : 'Help & Support'}
        onBack={() => navigate('/driver/settings')}
      />

      <Box
        className="hide-scrollbar"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {/* Emergency Hotline Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 107, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhoneIcon sx={{ color: '#FF6B00', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 700 }}>
                {isTagalog ? 'TODA & Transport Hotline' : 'TODA & Transport Hotline'}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>
                {isTagalog ? 'Calapan City Public Safety Office' : 'Calapan City Public Safety Office'}
              </Typography>
            </Box>
          </Box>

          <Button
            component="a"
            href="tel:09171234567"
            variant="contained"
            startIcon={<PhoneIcon />}
            sx={{
              backgroundColor: '#FF6B00',
              color: '#FFFFFF',
              borderRadius: '12px',
              height: '44px',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
            }}
          >
            {isTagalog ? 'Tumawag Ngayon: 0917-123-4567' : 'Call Hotline: 0917-123-4567'}
          </Button>
        </Paper>

        {/* Separator before FAQs */}
        <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />

        {/* FAQs Section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <HelpOutlinedIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
            <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              {isTagalog ? 'Mga Madalas Itanong (FAQ)' : 'Frequently Asked Questions'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {faqs.map((faq, idx) => {
              const panelId = `panel_${idx}`;
              return (
                <Accordion
                  key={idx}
                  expanded={expanded === panelId}
                  onChange={handleChange(panelId)}
                  elevation={0}
                  sx={{
                    borderRadius: '14px !important',
                    border: '1px solid #F1F5F9',
                    '&:before': { display: 'none' },
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#64748B' }} />}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {faq.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ borderTop: '1px solid #F8FAFC', pt: 1.5 }}>
                    <Typography sx={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                      {faq.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DriverSupportPage;
