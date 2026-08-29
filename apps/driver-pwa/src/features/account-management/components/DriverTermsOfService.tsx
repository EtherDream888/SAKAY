import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import Logo from '../../../common/components/Logo';
import PrimaryButton from '../../../common/components/PrimaryButton';
import { useLanguage } from '../../../utils/LanguageContext';

export const DriverTermsOfService: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const state = location.state as { phone?: string; driverName?: string; isRecovery?: boolean } | undefined;

  const isTagalog = language === 'tl';
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

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

  const handleAgree = () => {
    navigate('/driver/privacy-policy', {
      state: {
        phone: state?.phone,
        driverName: state?.driverName,
        isRecovery: state?.isRecovery,
      },
    });
  };

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
          onClick={() => navigate('/driver/verify-otp', { state })}
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
          {t.termsTitle}
        </Typography>
        <Typography
          sx={{
            fontSize: '13px',
            color: '#94A3B8',
            fontWeight: 500,
            mb: 2.5,
          }}
        >
          {t.lastUpdatedTerms}
        </Typography>

        {isTagalog ? (
          /* TAGALOG CONTENT */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Section 1 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                1. Pagiging Karapat-dapat
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Maaari lamang gumamit ng SAKAY Driver ang:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Rehistradong miyembro ng TODA</li>
                <li>May wastong Driver's License</li>
                <li>May balidong Franchise</li>
                <li>Naaprubahan ng CPSD</li>
              </Box>
              <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, mt: 1 }}>
                Ang account na hindi pa naaprubahan ng LGU ay hindi puwedeng mag-Online o tumanggap ng booking, kahit naipasa mo na ang lahat ng dokumento sa iyong TODA.
              </Typography>
            </Box>

            {/* Section 2 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                2. Katumpakan ng Impormasyon
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Responsibilidad mong tiyaking tama at napapanahon ang lahat ng impormasyong isinusumite.
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
                Ang pagsusumite ng maling o pekeng dokumento ay maaaring maging dahilan ng pagtanggi, pagsuspinde, o permanenteng pag-deactivate ng account.
              </Typography>
            </Box>

            {/* Section 3 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                3. Mga Istruktura ng Pamasahe
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Dapat mong mahigpit na sumunod sa mga taripa ng pamasahe na ipinag-uutos ng mga kasunduan ng Calapan LGU at TODA. Ang labis na paniningil sa mga pasahero o paghingi ng karagdagang bayad ay mahigpit na ipinagbabawal at ipapadala sa FEDOTRIP para sa parusa.
              </Typography>
            </Box>

            {/* Section 4 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                4. Pagtanggap ng Booking
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Kapag tinanggap mo ang isang booking:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Inaasahang pupuntahan mo agad ang pasahero.</li>
                <li>Dapat mong sundin ang itinakdang pickup at drop-off location.</li>
                <li>Hindi maaaring humingi ng dagdag na bayad na hindi ipinapakita ng sistema.</li>
              </Box>
            </Box>

            {/* Section 5 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                5. Pagkansela ng Booking
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Ang madalas o hindi makatarungang pagkansela ng booking ay maaaring magresulta sa:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Strike laban sa iyong account</li>
              </Box>
            </Box>

            {/* Section 6 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                6. Sistema ng Strike at Parusa
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, mb: 1.5 }}>
                Ang mga Strike ay naiipon sa loob ng rolling 90-day window:
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', mb: 1.5 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#334155' }}>Kabuuang Strike</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#334155' }}>Parusa</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>1</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>Warning Notification</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>3</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>Administrative Review</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>5</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>7-Day Suspension</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>8</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>30-Day Suspension</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>10</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>Permanenteng Pag-deactivate (LGU Review)</TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6 }}>
                Ang mga malubhang paglabag (tulad ng away, harassment, o pagmamaneho nang lasing) ay direktang hahantong sa agarang suspensyon habang iniimbestigahan.
              </Typography>
            </Box>

            {/* Section 7 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                7. Pag-uugali bilang Driver
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Tratuhin ang bawat pasahero nang magalang at patas</li>
                <li>Sundin ang mga alituntunin sa trapiko at kaligtasan</li>
                <li>Panatilihing naka-on ang GPS habang naka-Online o may aktibong biyahe</li>
              </Box>
            </Box>

            {/* Section 8 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                8. Pagsuspinde at Pag-deactivate
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Ang Suspension ay pansamantalang pag-block sa pagtanggap ng booking. Ang Deactivation ay nangangailangan ng manual review mula sa TODA at LGU Administrator bago maibalik ang access.
              </Typography>
            </Box>

            {/* Section 9 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                9. Pagbabago sa mga Tuntunin
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Maaaring i-update ng SAKAY, ng iyong TODA, o ng LGU ang mga tuntuning ito. Ipapaalam sa iyo ang mga makabuluhang pagbabago sa loob ng app.
              </Typography>
            </Box>

            {/* Section 10 */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                10. Pakikipag-ugnayan
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Para sa mga katanungan tungkol sa mga tuntuning ito, makipag-ugnayan sa iyong TODA Administrator o sa Calapan City LGU Transport Board.
              </Typography>
            </Box>
          </Box>
        ) : (
          /* ENGLISH CONTENT */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Section 1 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                1. Eligibility
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                To use SAKAY as a driver, you must meet all of the following:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Registered and active member of a participating TODA</li>
                <li>Hold a valid, unexpired Driver's License</li>
                <li>Hold a valid Franchise/MTOP registered under your TODA</li>
                <li>Approved and verified by TODA and LGU Administrators</li>
              </Box>
              <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, mt: 1 }}>
                An account that has not yet been approved by the LGU cannot go Online or receive bookings, even after all documents have been submitted to your TODA.
              </Typography>
            </Box>

            {/* Section 2 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                2. Accuracy of Information
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                You are responsible for making sure all information you submit is accurate, complete, and up to date.
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>
                Submitting false, outdated, or fake documents may result in rejection of your application, suspension, or permanent deactivation of your account.
              </Typography>
            </Box>

            {/* Section 3 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                3. Fare Structure
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                SAKAY strictly implements official fare rates set by the Calapan City LGU and your TODA. All payment must be made in cash directly after the ride. Charging excess fares or demanding unofficial fees is strictly prohibited and subject to penalties.
              </Typography>
            </Box>

            {/* Section 4 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                4. Accepting a Booking
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Once you accept a booking:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Proceed to the pickup location right away.</li>
                <li>Follow the booking's designated pickup and drop-off points.</li>
                <li>Never request extra payment that isn't displayed by the system.</li>
              </Box>
            </Box>

            {/* Section 5 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                5. Cancelling a Booking
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, mb: 1 }}>
                Frequent or unjustified cancellations may result in:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Strikes recorded against your driver account</li>
              </Box>
            </Box>

            {/* Section 6 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                6. Strike System and Penalties
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, mb: 1.5 }}>
                Strikes accumulate within a rolling 90-day period:
              </Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', mb: 1.5 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#334155' }}>Total Strikes</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', color: '#334155' }}>Consequence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>1</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>Warning Notification</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>3</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>Administrative Review</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>5</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>7-Day Suspension</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>8</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>30-Day Suspension</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: '12px', color: '#475569' }}>10</TableCell><TableCell sx={{ fontSize: '12px', color: '#475569' }}>Permanent Deactivation (LGU Review)</TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography sx={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.6 }}>
                Severe offenses (harassment, physical altercation, driving under the influence) will result in immediate suspension pending formal investigation.
              </Typography>
            </Box>

            {/* Section 7 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                7. Driver Conduct
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                <li>Treat every passenger with respect, fairness, and courtesy</li>
                <li>Adhere strictly to traffic rules and city transport ordinances</li>
                <li>Keep GPS and location permissions active while online</li>
              </Box>
            </Box>

            {/* Section 8 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                8. Suspension and Deactivation
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Suspensions temporarily block dispatch access for the set duration. Deactivations require formal administrative review from your TODA Board and LGU Transport Board.
              </Typography>
            </Box>

            {/* Section 9 */}
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                9. Changes to These Terms
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                SAKAY, your TODA, or the LGU may update these terms periodically. Key updates will be highlighted within the driver app.
              </Typography>
            </Box>

            {/* Section 10 */}
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 0.75 }}>
                10. Contact
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                For inquiries regarding these terms, contact your TODA Administrator or the Calapan City LGU Transport Board.
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
          disabled={!hasScrolledToBottom}
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

export default DriverTermsOfService;
