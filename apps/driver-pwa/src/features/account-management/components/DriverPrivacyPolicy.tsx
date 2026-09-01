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

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';

interface AccordionItem {
  id: string;
  title: string;
  desc: string;
}

export const DriverPrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const state = location.state as { phone?: string; driverName?: string; isRecovery?: boolean } | undefined;

  const isTagalog = language === 'tl';
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      if (scrollHeight - scrollTop - clientHeight <= 30) {
        setHasScrolledToBottom(true);
      }
    }
  };

  React.useEffect(() => {
    if (contentRef.current) {
      const { scrollHeight, clientHeight } = contentRef.current;
      if (scrollHeight <= clientHeight + 20) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAgree = () => {
    if (state?.isRecovery) {
      navigate('/driver/reset-password', {
        state: { phone: state?.phone },
      });
    } else {
      navigate('/driver/prepare-documents', {
        state: {
          driverName: state?.driverName || 'Aurelio Bautista',
          phone: state?.phone || '09181234567',
        },
      });
    }
  };

  const tagalogItems: AccordionItem[] = [
    {
      id: 'A',
      title: 'A. Personal na Impormasyon',
      desc: 'Pangalan, numero ng mobile, password, residential address, at profile photo.',
    },
    {
      id: 'B',
      title: 'B. Mga Dokumento para sa Beripikasyon',
      desc: "Larawan ng Driver's License, Franchise/MTOP permit, at traysikel kasama ang Body No. Sinusuri gamit ang OCR para sa agarang beripikasyon.",
    },
    {
      id: 'C',
      title: 'C. Lokasyon (GPS Data)',
      desc: 'Real-time na lokasyon habang naka-Online o may aktibong biyahe upang masubaybayan ang ruta at kaligtasan.',
    },
    {
      id: 'D',
      title: 'D. Impormasyon sa Biyahe',
      desc: 'Pickup at drop-off coordinates, distansya, taripa ng pamasahe, timestamps, at completion status.',
    },
    {
      id: 'E',
      title: 'E. Device at System Data',
      desc: 'Impormasyon sa device model, operating system version, at app security diagnostics para sa proteksyon laban sa pandaraya.',
    },
  ];

  const englishItems: AccordionItem[] = [
    {
      id: 'A',
      title: 'A. Personal Information',
      desc: 'Name, mobile number, password, residential address, and profile photo.',
    },
    {
      id: 'B',
      title: 'B. Verification Documents',
      desc: "Photos of your Professional Driver's License, Franchise/MTOP, and vehicle unit with sidecar body number, analyzed via OCR.",
    },
    {
      id: 'C',
      title: 'C. Location (GPS Data)',
      desc: 'Real-time GPS telemetry while Online or executing a dispatch to monitor passenger route safety.',
    },
    {
      id: 'D',
      title: 'D. Trip Information',
      desc: 'Pickup and drop-off coordinates, route distance in kilometers, calculated fare, timestamps, and status.',
    },
    {
      id: 'E',
      title: 'E. Device and System Data',
      desc: 'Device model, operating system version, and system diagnostic logs to ensure security and prevent account spoofing.',
    },
  ];

  const accordionItems = isTagalog ? tagalogItems : englishItems;

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
          onClick={() => navigate('/driver/terms-of-service', { state })}
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
        onScroll={handleScroll}
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
        {/* Title & Last Updated */}
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
          {t.privacyTitle}
        </Typography>
        <Typography
          sx={{
            fontSize: '13px',
            color: '#94A3B8',
            fontWeight: 500,
            mb: 1.75,
          }}
        >
          {t.lastUpdatedTerms}
        </Typography>

        {/* Intro */}
        <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 2.5 }}>
          {isTagalog
            ? 'Mahalaga sa amin ang iyong privacy. Ipinapaliwanag ng patakarang ito kung paano kinokolekta, ginagamit, iniimbak, at pinoprotektahan ng SAKAY ang iyong impormasyon.'
            : 'Your privacy matters to us. This policy explains what information SAKAY collects from you as a driver, how it is used, stored, and protected.'}
        </Typography>

        {isTagalog ? (
          /* TAGALOG PRIVACY POLICY */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Section 1 with Accordions */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                1. Pagtanggap sa mga Tuntunin
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1.5 }}>
                Upang gumana ang SAKAY, maaari naming kolektahin ang mga sumusunod:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {accordionItems.map((item) => {
                  const isOpen = expandedId === item.id;
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        borderRadius: '12px',
                        backgroundColor: isOpen ? '#FFF7ED' : '#F8FAFC',
                        border: isOpen ? '1px solid #FFEDD5' : '1px solid #E2E8F0',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box
                        onClick={() => toggleAccordion(item.id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 2,
                          py: 1.5,
                          cursor: 'pointer',
                        }}
                      >
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                          {item.title}
                        </Typography>
                        {isOpen ? (
                          <KeyboardArrowUpIcon sx={{ fontSize: 18, color: '#FF6B00' }} />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                        )}
                      </Box>
                      <Collapse in={isOpen}>
                        <Box sx={{ px: 2, pb: 1.5, pt: 0 }}>
                          <Typography sx={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6 }}>
                            {item.desc}
                          </Typography>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Section 2 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                2. Paano Namin Ginagamit ang Iyong Impormasyon
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Ginagamit namin ang iyong impormasyon upang:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>I-verify ang iyong account</li>
                <li>Tanggapin at pamahalaan ang booking</li>
                <li>Magbigay ng real-time na lokasyon sa pasahero at FEDOTRIP</li>
                <li>Kalkulahin ang pamasahe</li>
                <li>Mag-record ng biyahe at kita</li>
                <li>Imbestigahan ang mga reklamo</li>
                <li>Pigilan ang panloloko at maling paggamit ng sistema</li>
                <li>Sumunod sa mga regulasyon ng FEDOTRIP</li>
              </Box>
            </Box>

            {/* Section 3 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                3. Paggamit ng Lokasyon
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Ginagamit ang iyong lokasyon para sa:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Pagpapadala ng booking</li>
                <li>Pag-track ng biyahe</li>
                <li>Pag-monitor ng CPSD</li>
                <li>Kaligtasan ng pasahero at drayber</li>
              </Box>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6, mt: 1 }}>
                Ang GPS route data ay iniimbak nang hanggang <strong>90 araw</strong>, maliban kung kailangan para sa imbestigasyon.
              </Typography>
            </Box>

            {/* Section 4 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                4. Pagbabahagi ng Impormasyon
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Maaaring makita ng iyong TODA Administrator, LGU Administrator, at ng pasahero (limitado lamang sa iyong pangalan, larawan, at franchise number habang aktibo ang biyahe). Hindi namin ibinebenta ang iyong impormasyon sa mga third party.
              </Typography>
            </Box>

            {/* Section 5 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                5. Pag-iimbak at Pagtanggal ng Data
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Ang mga larawan ng dokumento ay iniimbak nang naka-encrypt at awtomatikong buburahin kapag natapos na ang kinakailangang panahon ng verification o appeal.
              </Typography>
            </Box>

            {/* Section 6 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                6. Ang Iyong mga Karapatan
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Malaman kung anong impormasyon ang hawak namin tungkol sa iyo</li>
                <li>Humiling ng kopya ng iyong personal na data</li>
                <li>Hilingin na itama ang mali o lumang detalye</li>
                <li>Humiling ng pagbura alinsunod sa Data Privacy Act ng 2012 (RA 10173)</li>
              </Box>
            </Box>

            {/* Section 7 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                7. Seguridad ng Data
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Nagpapatupad kami ng makabagong encryption at mahigpit na role-based security access controls upang mapanatiling ligtas ang iyong account.
              </Typography>
            </Box>

            {/* Section 8 & 9 */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                8. Pakikipag-ugnayan
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Para sa mga katanungan tungkol sa iyong data, makipag-ugnayan sa iyong TODA Administrator o sa Calapan City LGU Transport Board.
              </Typography>
            </Box>
          </Box>
        ) : (
          /* ENGLISH PRIVACY POLICY */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Section 1 with Accordions */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                1. Information We Collect
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1.5 }}>
                To operate SAKAY and ensure passenger safety, we collect:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {accordionItems.map((item) => {
                  const isOpen = expandedId === item.id;
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        borderRadius: '12px',
                        backgroundColor: isOpen ? '#FFF7ED' : '#F8FAFC',
                        border: isOpen ? '1px solid #FFEDD5' : '1px solid #E2E8F0',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box
                        onClick={() => toggleAccordion(item.id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 2,
                          py: 1.5,
                          cursor: 'pointer',
                        }}
                      >
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                          {item.title}
                        </Typography>
                        {isOpen ? (
                          <KeyboardArrowUpIcon sx={{ fontSize: 18, color: '#FF6B00' }} />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                        )}
                      </Box>
                      <Collapse in={isOpen}>
                        <Box sx={{ px: 2, pb: 1.5, pt: 0 }}>
                          <Typography sx={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6 }}>
                            {item.desc}
                          </Typography>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Section 2 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                2. How We Use Your Information
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                We process your data to:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Verify your identity and credential eligibility</li>
                <li>Match you with relevant TODA passenger dispatches</li>
                <li>Calculate exact fares under city regulations</li>
                <li>Monitor live rides for safety and dispute resolution</li>
                <li>Record earnings summaries and historical trip logs</li>
                <li>Investigate submitted complaints or strike appeals</li>
                <li>Prevent unauthorized vehicle substitution and abuse</li>
                <li>Ensure compliance with LGU Transport Board rules</li>
              </Box>
            </Box>

            {/* Section 3 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                3. How We Use Location
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Location (GPS) is required for:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Dispatching nearby trip requests</li>
                <li>Tracking route progress in real time</li>
                <li>Monitoring CPSD compliance and security</li>
                <li>Protecting both commuters and drivers</li>
              </Box>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6, mt: 1 }}>
                GPS route telemetry is retained for up to <strong>90 days</strong>, unless required for ongoing investigations.
              </Typography>
            </Box>

            {/* Section 4 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                4. Sharing Your Information
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Accessible exclusively to your TODA Administrator, LGU Administrator, and the assigned commuter (limited to name, photo, and franchise number during active trips). We never sell your data to third parties.
              </Typography>
            </Box>

            {/* Section 5 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                5. Data Storage and Deletion
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Uploaded license and registration document images are stored encrypted and permanently deleted once the regulatory verification window concludes.
              </Typography>
            </Box>

            {/* Section 6 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                6. Your Rights
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Access personal information on file</li>
                <li>Request copies of historical account data</li>
                <li>Request corrections of inaccurate records</li>
                <li>Request data deletion under the Data Privacy Act of 2012 (RA 10173)</li>
              </Box>
            </Box>

            {/* Section 7 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                7. Data Security
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                We utilize encrypted storage, SSL transport security, and multi-factor administrative access controls to safeguard all driver records.
              </Typography>
            </Box>

            {/* Section 8 & 9 */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                8. Contact
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                For questions regarding your privacy rights, contact your TODA Administrator or the Calapan City LGU Transport Board.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 3. Sticky Bottom Action Button */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px calc(var(--safe-area-bottom) + 16px) 24px',
          background: 'linear-gradient(to top, #FFFFFF 75%, rgba(255, 255, 255, 0.9) 90%, rgba(255, 255, 255, 0) 100%)',
          zIndex: 15,
        }}
      >
        <PrimaryButton
          fullWidth
          onClick={handleAgree}
          sx={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 800,
            backgroundColor: '#FF6B00',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#E66000', boxShadow: 'none' },
          }}
        >
          {t.iAgree}
        </PrimaryButton>
      </Box>
    </Box>
  );
};

export default DriverPrivacyPolicy;
