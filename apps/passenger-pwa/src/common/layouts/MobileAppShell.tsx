import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import { supabase } from "../../services/supabaseClient";
import SakayToast from "../../common/components/SakayToast";
import { useLanguage } from "../../utils/LanguageContext";

interface MobileAppShellProps {
  children?: React.ReactNode;
}

const GUARDED_PATHS = ['/dashboard', '/profile', '/settings', '/saved-places', '/support', '/app-feedback', '/change-password', '/track-reports', '/location-permission', '/new-trip', '/set-place', '/book-summary', '/trip-monitoring', '/feedback', '/incident-report', '/history', '/trip-details'];

/**
 * MobileAppShell - The central mobile application container for the Passenger PWA.
 * 
 * Responsibilities:
 * - Mobile viewport sizing (Portrait mobile phone frame 412x892 on desktop, 100vw x 100dvh on mobile)
 * - Safe area boundary containment
 * - Global overflow management
 * - Consistent background styling
 * - Passenger Session Guard (checking single active device session)
 */
export const MobileAppShell: React.FC<MobileAppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const [sessionToastOpen, setSessionToastOpen] = React.useState(false);
  const [sessionToastMsg, setSessionToastMsg] = React.useState('');

  React.useEffect(() => {
    const checkSession = async () => {
      const isGuarded = GUARDED_PATHS.some(path => location.pathname.startsWith(path));
      if (!isGuarded) return;

      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        const localToken = localStorage.getItem('sakay_session_token');
        const { data: profile } = await supabase
          .from("passenger")
          .select("session_id")
          .eq("auth_user_id", sess.session.user.id)
          .maybeSingle();
        
        if (profile?.session_id && profile.session_id !== localToken) {
          await supabase.auth.signOut();
          localStorage.removeItem('sakay_session_token');
          localStorage.removeItem('sakay_passenger_id');
          localStorage.removeItem('sakay_passenger_name');
          localStorage.removeItem('sakay_passenger_phone');
          localStorage.removeItem('sakay_passenger_status');
          
          setSessionToastMsg(language === 'tl' ? 'Ang iyong account ay na-log in sa ibang device.' : 'Your account was logged in from another device.');
          setSessionToastOpen(true);
          
          navigate('/login', { replace: true });
        }
      }
    };
    
    checkSession();
  }, [location.pathname, navigate, language]);

  return (
    <Box className="app-container">
      <SakayToast 
        open={sessionToastOpen} 
        message={sessionToastMsg} 
        severity="error" 
        onClose={() => setSessionToastOpen(false)} 
      />
      <Box
        component="main"
        className="phone-simulator hide-scrollbar"
        id="mobile-app-shell"
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
          }}
        >
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
};

export default MobileAppShell;
