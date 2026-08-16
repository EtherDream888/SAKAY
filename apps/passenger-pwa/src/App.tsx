import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./styles/theme";
import { LanguageProvider } from "./utils/LanguageContext";
import MobileAppShell from "./common/layouts/MobileAppShell";

// Pages
import Splash from "./features/account-management/components/Splash/Splash";
import AccountSelection from "./features/account-management/components/AccountSelection/AccountSelection";
import Login from "./features/account-management/components/Login/Login";
import Register from "./features/account-management/components/Register/Register";
import VerifyOtp from "./features/account-management/components/VerifyOtp/VerifyOtp";
import ForgotPassword from "./features/account-management/components/ForgotPassword/ForgotPassword";
import ResetPassword from "./features/account-management/components/ResetPassword/ResetPassword";
import RegistrationSuccess from "./features/account-management/components/RegistrationSuccess/RegistrationSuccess";
import ProfileEditor from "./features/account-management/components/ProfileEditor/ProfileEditor";
import Dashboard from "./features/ride-booking/components/Dashboard/Dashboard";
import LocationPermission from "./features/ride-booking/components/LocationPermission/LocationPermission";
import NewTrip from "./features/ride-booking/components/NewTrip/NewTrip";
import SetPlace from "./features/ride-booking/components/SetPlace/SetPlace";
import BookSummary from "./features/ride-booking/components/BookSummary/BookSummary";
import PassengerHistory from "./features/trip-history/components/PassengerHistory";
import { TripMonitoring } from "./features/trip-monitoring/components/TripMonitoring";
import { PassengerFeedback } from "./features/feedback/components/PassengerFeedback";
import { IncidentReporting } from "./features/incident-reporting/components/IncidentReporting";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MobileAppShell />}>
              <Route path="/" element={<Splash />} />
              <Route path="/splash" element={<Splash />} />
              <Route path="/account-selection" element={<AccountSelection />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfileEditor />} />
              <Route path="/location-permission" element={<LocationPermission />} />
              <Route path="/new-trip" element={<NewTrip />} />
              <Route path="/set-place" element={<SetPlace />} />
              <Route path="/book-summary" element={<BookSummary />} />
              <Route path="/trip-monitoring" element={<TripMonitoring />} />
              <Route path="/feedback" element={<PassengerFeedback />} />
              <Route path="/incident-report" element={<IncidentReporting />} />
              <Route path="/history" element={<PassengerHistory />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;