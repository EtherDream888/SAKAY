import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

import Logo from '../../../../common/components/Logo';
import PrimaryButton from '../../../../common/components/PrimaryButton';
import { useLanguage } from '../../../../utils/LanguageContext';

interface AccordionItem {
  id: string;
  title: string;
  desc: string;
}

export const PassengerPrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const state = location.state as { phone?: string; passengerName?: string; isRecovery?: boolean; fromRegister?: boolean } | undefined;

  const isTagalog = language === 'tl';
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAgree = () => {
    if (state?.fromRegister) {
      navigate(-1);
    } else {
      navigate('/registration-success', {
        state: {
          name: state?.passengerName || 'Passenger',
          role: 'passenger',
        },
      });
    }
  };

  const tagalogItems: AccordionItem[] = [
    {
      id: 'A',
      title: 'A. Personal na Impormasyon',
      desc: 'Pangalan, apelyido, numero ng mobile phone, opsyonal na email address, at secure password na ginagamit sa paggawa ng inyong account.',
    },
    {
      id: 'B',
      title: 'B. Lokasyon (GPS Data)',
      desc: 'Real-time na lokasyon ng iyong device habang ginagamit ang application upang mahanap ang pinakamalapit na tricycle, maitakda ang pickup location, at masubaybayan ang ruta ng biyahe para sa inyong kaligtasan.',
    },
    {
      id: 'C',
      title: 'C. Kasaysayan ng Biyahe at Pamasahe',
      desc: 'Mga tala ng iyong mga nakaraang biyahe kabilang ang pickup at drop-off points, distansya, opisyal na kalkulasyon ng pamasahe, at oras ng booking.',
    },
    {
      id: 'D',
      title: 'D. Rating, Feedback, at Ulat ng Insidente',
      desc: 'Mga pagsusuri (ratings), komento sa drayber, at mga opisyal na ulat ng insidente (tulad ng labis na paniningil o naiwang gamit) na isinusumite sa TODA at Calapan LGU.',
    },
    {
      id: 'E',
      title: 'E. Device Telemetry at Seguridad',
      desc: 'Impormasyon sa device model, operating system version, at diagnostic logs para sa proteksyon laban sa panloloko (anti-fraud) at pagpapanatili ng katatagan ng app.',
    },
  ];

  const englishItems: AccordionItem[] = [
    {
      id: 'A',
      title: 'A. Personal Information',
      desc: 'First name, last name, mobile phone number, optional email address, and encrypted credentials used to establish your account.',
    },
    {
      id: 'B',
      title: 'B. Location (GPS Data)',
      desc: 'Real-time geographic coordinates while using the application to locate available tricycles nearby, accurately set your pickup location, and track transit routes for passenger safety.',
    },
    {
      id: 'C',
      title: 'C. Trip History & Fare Records',
      desc: 'Records of your completed and active trips, including pickup and drop-off coordinates, distance traveled, official fare calculations, and timestamps.',
    },
    {
      id: 'D',
      title: 'D. Ratings, Feedback & Incident Reports',
      desc: 'Feedback, driver ratings, and incident reports (such as overcharging, lost properties, or safety concerns) submitted to TODA and Calapan LGU.',
    },
    {
      id: 'E',
      title: 'E. Device Telemetry & Security',
      desc: 'Device model details, operating system versions, and security diagnostics collected to prevent fraudulent bookings and ensure platform stability.',
    },
  ];

  const items = isTagalog ? tagalogItems : englishItems;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header with Rounded Back Button and SAKAY Logo */}
      <Box
        sx={{
          padding: 'calc(var(--safe-area-top) + 16px) 24px 12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: '#0F172A',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            width: 44,
            height: 44,
            '&:hover': { backgroundColor: '#F8FAFC' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Logo color="orange" width={110} />
      </Box>

      {/* 2. Scrollable Content */}
      <Box
        ref={contentRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px calc(var(--safe-area-bottom) + 96px) 24px',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {/* Title & Subtitle */}
        <Typography
          sx={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#0F172A',
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            mb: 0.5,
          }}
        >
          {isTagalog ? 'Patakaran sa Privacy ng Pasahero' : 'Passenger Privacy Policy'}
        </Typography>
        <Typography
          sx={{
            fontSize: '13px',
            color: '#94A3B8',
            fontWeight: 500,
            mb: 2.5,
          }}
        >
          {isTagalog ? 'Huling binago: Hulyo 2026' : 'Last updated: July 2026'}
        </Typography>

        {/* Intro */}
        <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 2.5 }}>
          {isTagalog
            ? 'Pinapahalagahan ng SAKAY ang iyong privacy alinsunod sa Philippine Data Privacy Act of 2012 (Republic Act No. 10173). Ipinapaliwanag dito kung paano kinokolekta, ginagamit, at pinoprotektahan ang iyong personal na datos para sa maayos na serbisyo ng transportasyon.'
            : 'SAKAY values your privacy in full compliance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173). This policy details how your personal data is collected, utilized, and safeguarded to facilitate localized tricycle transport services.'}
        </Typography>

        {/* Accordions */}
        <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 1.5 }}>
          {isTagalog ? 'Mga Datos na Kinokolekta' : 'Information We Collect'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box
                  onClick={() => toggleAccordion(item.id)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {item.title}
                  </Typography>
                  {isExpanded ? (
                    <KeyboardArrowUpIcon sx={{ fontSize: 20, color: '#FF6B00' }} />
                  ) : (
                    <KeyboardArrowDownIcon sx={{ fontSize: 20, color: '#94A3B8' }} />
                  )}
                </Box>
                <Collapse in={isExpanded}>
                  <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>

        {/* Data Sharing & Retention */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
            {isTagalog ? 'Pagbabahagi at Proteksyon ng Datos' : 'Data Sharing & Protection'}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
            {isTagalog
              ? 'Ibinabahagi lamang ang iyong pangalan at pickup location sa drayber na tumanggap ng iyong booking upang maisagawa ang pagsundo. Hindi kailanman ibinebenta ng SAKAY ang iyong personal na datos sa mga ikatlong partido para sa pag-aanunsyo o komersyal na layunin.'
              : 'Your name and pickup location are only shared with the specific driver who accepts your dispatch request. SAKAY never sells your personal information to third parties for marketing purposes.'}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
            {isTagalog
              ? 'Ang mga tala ng biyahe at ulat ng insidente ay maaaring suriin ng mga opisyal ng TODA at Calapan LGU CPSD kung mayroong pormal na reklamo o imbestigasyon para sa kaligtasan ng publiko.'
              : 'Trip records and incident reports may be reviewed by TODA officers and Calapan City LGU CPSD in the event of formal disputes, lost property claims, or safety investigations.'}
          </Typography>
        </Box>
      </Box>

      {/* 3. Pinned Bottom Action Bar with Agree Button */}
      <Box
        sx={{
          padding: '12px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F1F5F9',
          flexShrink: 0,
          zIndex: 30,
        }}
      >
        <PrimaryButton
          onClick={handleAgree}
          fullWidth
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            color: '#FFFFFF',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#E66000',
              boxShadow: 'none',
            },
          }}
        >
          {isTagalog ? 'Sumasang-ayon Ako' : 'I Agree'}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default PassengerPrivacyPolicy;
