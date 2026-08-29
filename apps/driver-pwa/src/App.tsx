import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import theme from './styles/theme';
import { LanguageProvider } from './utils/LanguageContext';
import DriverMobileAppShell from './common/layouts/DriverMobileAppShell';
import { DriverSplash } from './features/account-management/components/DriverSplash';
import { AccountSelection } from './features/account-management/components/AccountSelection';
import { DriverLogin } from './features/account-management/components/DriverLogin';
import { DriverRegister } from './features/account-management/components/DriverRegister';
import { DriverVerifyOtp } from './features/account-management/components/DriverVerifyOtp';
import { DriverTermsOfService } from './features/account-management/components/DriverTermsOfService';
import { DriverPrivacyPolicy } from './features/account-management/components/DriverPrivacyPolicy';
import { DriverPrepareDocuments } from './features/account-management/components/DriverPrepareDocuments';
import { DriverPrepareLicense } from './features/account-management/components/DriverPrepareLicense';
import { DriverScanLicenseFront } from './features/account-management/components/DriverScanLicenseFront';
import { DriverReviewLicenseFront } from './features/account-management/components/DriverReviewLicenseFront';
import { DriverScanLicenseBack } from './features/account-management/components/DriverScanLicenseBack';
import { DriverReviewLicenseBack } from './features/account-management/components/DriverReviewLicenseBack';
import { DriverLicenseLoading } from './features/account-management/components/DriverLicenseLoading';
import { DriverConfirmLicenseInfo } from './features/account-management/components/DriverConfirmLicenseInfo';
import { DriverMtopInstructions } from './features/account-management/components/DriverMtopInstructions';
import { DriverScanMtop } from './features/account-management/components/DriverScanMtop';
import { DriverReviewMtop } from './features/account-management/components/DriverReviewMtop';
import { DriverMtopLoading } from './features/account-management/components/DriverMtopLoading';
import { DriverConfirmMtopInfo } from './features/account-management/components/DriverConfirmMtopInfo';
import { DriverScanFace } from './features/account-management/components/DriverScanFace';
import { DriverReviewFace } from './features/account-management/components/DriverReviewFace';
import { DriverFaceLoading } from './features/account-management/components/DriverFaceLoading';
import { DriverFaceResult } from './features/account-management/components/DriverFaceResult';
import { DriverConfirmAllInfo } from './features/account-management/components/DriverConfirmAllInfo';
import { DriverRegistrationComplete } from './features/account-management/components/DriverRegistrationComplete';
import { DriverForgotPassword } from './features/account-management/components/DriverForgotPassword';
import { DriverResetPassword } from './features/account-management/components/DriverResetPassword';
import { DriverStatusMonitor } from './features/account-management/components/DriverStatusMonitor';
import { DriverProfileEditor } from './features/account-management/components/DriverProfileEditor';
import { DriverAvailabilityHome } from './features/availability/components/DriverAvailabilityHome';
import { DriverNavigation } from './features/navigation/components/DriverNavigation';
import { DriverActiveTrip } from './features/trip-management/components/DriverActiveTrip';
import { DriverEarnings } from './features/earnings/components/DriverEarnings';
import { DriverNotifications } from './features/notifications/components/DriverNotifications';
import { DriverTripHistory } from './features/trip-history/components/DriverTripHistory';

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <Routes>
          <Route element={<DriverMobileAppShell />}>
            {/* Splash & Account Selection */}
            <Route path="/" element={<DriverSplash />} />
            <Route path="/splash" element={<DriverSplash />} />
            <Route path="/driver/splash" element={<DriverSplash />} />
            <Route path="/account-selection" element={<AccountSelection />} />

            {/* Authentication & Onboarding Routes */}
            <Route path="/login" element={<DriverLogin />} />
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route path="/register" element={<DriverRegister />} />
            <Route path="/driver/register" element={<DriverRegister />} />
            <Route path="/verify-otp" element={<DriverVerifyOtp />} />
            <Route path="/driver/verify-otp" element={<DriverVerifyOtp />} />
            <Route path="/terms-of-service" element={<DriverTermsOfService />} />
            <Route path="/driver/terms-of-service" element={<DriverTermsOfService />} />
            <Route path="/driver/terms" element={<DriverTermsOfService />} />
            <Route path="/privacy-policy" element={<DriverPrivacyPolicy />} />
            <Route path="/driver/privacy-policy" element={<DriverPrivacyPolicy />} />
            <Route path="/driver/privacy" element={<DriverPrivacyPolicy />} />
            <Route path="/prepare-documents" element={<DriverPrepareDocuments />} />
            <Route path="/driver/prepare-documents" element={<DriverPrepareDocuments />} />
            <Route path="/driver/documents" element={<DriverPrepareDocuments />} />
            <Route path="/prepare-license" element={<DriverPrepareLicense />} />
            <Route path="/driver/prepare-license" element={<DriverPrepareLicense />} />
            <Route path="/driver/license-guidelines" element={<DriverPrepareLicense />} />
            <Route path="/scan-license-front" element={<DriverScanLicenseFront />} />
            <Route path="/driver/scan-license-front" element={<DriverScanLicenseFront />} />
            <Route path="/review-license-front" element={<DriverReviewLicenseFront />} />
            <Route path="/driver/review-license-front" element={<DriverReviewLicenseFront />} />
            <Route path="/scan-license-back" element={<DriverScanLicenseBack />} />
            <Route path="/driver/scan-license-back" element={<DriverScanLicenseBack />} />
            <Route path="/review-license-back" element={<DriverReviewLicenseBack />} />
            <Route path="/driver/review-license-back" element={<DriverReviewLicenseBack />} />
            <Route path="/license-loading" element={<DriverLicenseLoading />} />
            <Route path="/driver/license-loading" element={<DriverLicenseLoading />} />
            <Route path="/confirm-license-info" element={<DriverConfirmLicenseInfo />} />
            <Route path="/driver/confirm-license-info" element={<DriverConfirmLicenseInfo />} />
            <Route path="/mtop-instructions" element={<DriverMtopInstructions />} />
            <Route path="/driver/mtop-instructions" element={<DriverMtopInstructions />} />
            <Route path="/scan-mtop" element={<DriverScanMtop />} />
            <Route path="/driver/scan-mtop" element={<DriverScanMtop />} />
            <Route path="/review-mtop" element={<DriverReviewMtop />} />
            <Route path="/driver/review-mtop" element={<DriverReviewMtop />} />
            <Route path="/mtop-loading" element={<DriverMtopLoading />} />
            <Route path="/driver/mtop-loading" element={<DriverMtopLoading />} />
            <Route path="/confirm-mtop-info" element={<DriverConfirmMtopInfo />} />
            <Route path="/driver/confirm-mtop-info" element={<DriverConfirmMtopInfo />} />
            <Route path="/scan-face" element={<DriverScanFace />} />
            <Route path="/driver/scan-face" element={<DriverScanFace />} />
            <Route path="/review-face" element={<DriverReviewFace />} />
            <Route path="/driver/review-face" element={<DriverReviewFace />} />
            <Route path="/face-loading" element={<DriverFaceLoading />} />
            <Route path="/driver/face-loading" element={<DriverFaceLoading />} />
            <Route path="/face-result" element={<DriverFaceResult />} />
            <Route path="/driver/face-result" element={<DriverFaceResult />} />
            <Route path="/confirm-all-info" element={<DriverConfirmAllInfo />} />
            <Route path="/driver/confirm-all-info" element={<DriverConfirmAllInfo />} />
            <Route path="/registration-complete" element={<DriverRegistrationComplete />} />
            <Route path="/driver/registration-complete" element={<DriverRegistrationComplete />} />
            <Route path="/forgot-password" element={<DriverForgotPassword />} />
            <Route path="/driver/forgot-password" element={<DriverForgotPassword />} />
            <Route path="/reset-password" element={<DriverResetPassword />} />
            <Route path="/driver/reset-password" element={<DriverResetPassword />} />
            <Route path="/driver/status" element={<DriverStatusMonitor />} />

            {/* Authenticated Driver Dashboard & Portals */}
            <Route path="/driver/home" element={<DriverAvailabilityHome />} />
            <Route path="/driver/navigation" element={<DriverNavigation />} />
            <Route path="/driver/active-trip" element={<DriverActiveTrip />} />
            <Route path="/driver/earnings" element={<DriverEarnings />} />
            <Route path="/driver/notifications" element={<DriverNotifications />} />
            <Route path="/driver/history" element={<DriverTripHistory />} />
            <Route path="/driver/profile" element={<DriverProfileEditor />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
