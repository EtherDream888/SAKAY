import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Paper,
  CircularProgress,
  Fade,
  Snackbar,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import appIconDriver from '@sakay/shared/assets/icons/app-icon-driver.png';
import logoTextOrange from '@sakay/shared/assets/images/logo-text-orange.png';
import splashBg from '@sakay/shared/assets/images/splash-bg.png';
import { useAuth } from '../contexts/AuthContext';
import { TodaRegistrationFlow } from '../components/auth/TodaRegistrationFlow';

const inputStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    '& fieldset': {
      borderColor: '#E5E5EA',
    },
    '&:hover fieldset': {
      borderColor: '#C7C7CC',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#FF6B00',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '14px',
    color: '#86868B',
    '&.Mui-focused': {
      color: '#FF6B00',
    },
  },
};

const primaryButtonStyles = {
  borderRadius: '12px',
  padding: '12px 24px',
  backgroundColor: '#FF6B00',
  color: '#FFFFFF',
  textTransform: 'none',
  fontSize: '14px',
  fontWeight: 600,
  boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
  '&:hover': {
    backgroundColor: '#E05E00',
    boxShadow: '0 6px 16px rgba(255, 107, 0, 0.35)',
  },
  '&.Mui-disabled': {
    backgroundColor: '#FFB885',
    color: '#FFFFFF',
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, error: authError, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup_toda'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authSuccessLoading, setAuthSuccessLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const fromLocation = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter your email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      window.localStorage.setItem('sakay_remember_me', rememberMe.toString());
      const res = await signIn(email, password);

      if (res.success) {
        setAuthSuccessLoading(true);
        setTimeout(() => {
          if (res.role === 'toda_admin') {
            window.location.href = window.location.hostname === 'localhost' ? 'http://localhost:5175/operations' : '/toda/';
          } else {
            navigate(fromLocation, { replace: true });
          }
        }, 2200);
      } else {
        setLocalError('Incorrect email or password. Please check your details and try again.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [activeAuthError, setActiveAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (authError) setActiveAuthError(authError);
  }, [authError]);

  useEffect(() => {
    if (localError || activeAuthError || localSuccess) {
      const timer = setTimeout(() => {
        setLocalError(null);
        setActiveAuthError(null);
        setLocalSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [localError, activeAuthError, localSuccess]);

  const displayError = localError || (mode === 'signin' ? activeAuthError : null);
  const isEmailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCloseSnackbar = () => {
    setLocalError(null);
    setActiveAuthError(null);
    setLocalSuccess(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        overflowX: 'hidden',
        py: { xs: 4, md: 6 },
        backgroundColor: '#FAFAF9',
      }}
    >
      {/* Centering wrapper without zoom/scale transform */}
      <Box
        sx={{
          m: 'auto',
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Animated Moving Border Wrapper */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            borderRadius: '22px',
            padding: '2px',
            background: 'linear-gradient(90deg, #FF6B00 0%, #FF8A00 33%, #E04800 66%, #FF6B00 100%)',
            backgroundSize: '300% 100%',
            animation: 'gradient-border 4s linear infinite',
            '@keyframes gradient-border': {
              '0%': { backgroundPosition: '0% 50%' },
              '100%': { backgroundPosition: '100% 50%' },
            },
            boxShadow: '0 8px 32px rgba(255, 107, 0, 0.1)',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              height: { xs: 'auto', md: mode === 'signin' ? '560px' : '680px' },
              minHeight: { xs: '100vh', md: mode === 'signin' ? '560px' : '680px' },
              maxHeight: '95vh',
            }}
          >
            {/* Left Form Pane */}
            <Box
              onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
              sx={{
                flex: mode === 'signup_toda' ? '1 1 100%' : '1 1 50%',
                maxWidth: mode === 'signup_toda' ? '100%' : { xs: '100%', md: '50%' },
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: { xs: 'visible', md: 'hidden' },
                overflowX: 'hidden',
                position: 'relative',
                justifyContent: mode === 'signin' ? 'center' : 'flex-start',
              }}
            >
              {/* Inner Padding Container */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  flexGrow: 1,
                  boxSizing: 'border-box',
                  px: { xs: 3, sm: mode === 'signup_toda' ? 6 : 6 },
                  py: { xs: 5, sm: mode === 'signup_toda' ? 6 : 8 },
                }}
              >
                {!authSuccessLoading && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: mode === 'signin' ? 'column' : 'row',
                      alignItems: mode === 'signin' ? 'center' : 'flex-start',
                      justifyContent: mode === 'signin' ? 'center' : 'space-between',
                      textAlign: mode === 'signin' ? 'center' : 'left',
                      position: mode === 'signup_toda' ? 'sticky' : 'static',
                      top: 0,
                      zIndex: 10,
                      background:
                        mode === 'signup_toda' && scrollTop > 10
                          ? 'linear-gradient(to bottom, rgba(255,255,255,1) 40%, rgba(255,255,255,0.85) 75%, rgba(255,255,255,0) 100%)'
                          : 'transparent',
                      backdropFilter: mode === 'signup_toda' && scrollTop > 10 ? 'blur(8px)' : 'none',
                      mx: { xs: -3, sm: -6 },
                      px: { xs: 3, sm: 6 },
                      pt: { xs: 5, sm: mode === 'signup_toda' ? 6 : 8 },
                      pb: 4,
                      mt: { xs: -5, sm: mode === 'signup_toda' ? -6 : -8 },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: mode === 'signin' ? 'center' : 'flex-end',
                        gap: 1.5,
                        mb: mode === 'signup_toda' && scrollTop > 10 ? 1 : mode === 'signin' ? 3.5 : 0,
                        transition: 'all 0.3s ease',
                        transform: mode === 'signup_toda' && scrollTop > 10 ? 'scale(0.85)' : 'scale(1)',
                        transformOrigin: mode === 'signin' ? 'top center' : 'top right',
                        order: mode === 'signin' ? 1 : 2,
                      }}
                    >
                      <Box component="img" src={appIconDriver} alt="App Icon" sx={{ height: 32, objectFit: 'contain' }} />
                      <Box component="img" src={logoTextOrange} alt="SAKAY" sx={{ height: 22, objectFit: 'contain' }} />
                    </Box>

                    {mode === 'signin' && (
                      <Box sx={{ mt: -1.5, mb: 1, order: 2 }}>
                        <Typography variant="h1" sx={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', mb: 0.5 }}>
                          Welcome back
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: '#86868B', fontWeight: 400 }}>
                          Login to your administrator account to continue
                        </Typography>
                      </Box>
                    )}

                    {mode === 'signup_toda' && (
                      <Box sx={{ mt: 0, mb: 1, order: 1 }}>
                        <Typography variant="h1" sx={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', mb: 0.5 }}>
                          TODA Application
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: '#86868B', fontWeight: 400 }}>
                          Register your TODA organization and apply for accreditation.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Sign In Form */}
                {mode === 'signin' && !authSuccessLoading && (
                  <Fade in={true} timeout={400}>
                    <Box
                      component="form"
                      onSubmit={handleSignIn}
                      noValidate
                      sx={{ width: '100%', maxWidth: '340px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}
                    >
                      <TextField
                        fullWidth
                        label="Email *"
                        type="email"
                        variant="outlined"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting || authLoading}
                        autoComplete="email"
                        autoFocus
                        error={isEmailInvalid}
                        helperText={isEmailInvalid ? 'Please enter a valid email address.' : ' '}
                        slotProps={{
                          formHelperText: {
                            sx: { mx: 0, mt: 0.5, fontSize: '12px', height: isEmailInvalid ? 'auto' : 0, opacity: isEmailInvalid ? 1 : 0, transition: 'opacity 0.3s' },
                          },
                        }}
                        sx={inputStyles}
                      />

                      <TextField
                        fullWidth
                        label="Password *"
                        type={showPassword ? 'text' : 'password'}
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting || authLoading}
                        autoComplete="current-password"
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#86868B', mr: 0.5 }}>
                                  {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={inputStyles}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: -1 }}>
                        <FormControlLabel
                          control={<Checkbox size="small" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} sx={{ color: '#C7C7CC', '&.Mui-checked': { color: '#FF6B00' }, py: 0.5 }} />}
                          label={<Typography sx={{ fontSize: '13px', color: '#1D1D1F', fontWeight: 500 }}>Remember me</Typography>}
                          sx={{ ml: -1 }}
                        />
                        <Button variant="text" sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#FF6B00', p: 0, minWidth: 'auto', '&:hover': { background: 'none', textDecoration: 'underline' } }}>
                          Forgot your password?
                        </Button>
                      </Box>

                      <Button type="submit" variant="contained" fullWidth disabled={isSubmitting || authLoading} sx={primaryButtonStyles}>
                        {isSubmitting || authLoading ? <CircularProgress size={20} sx={{ color: '#FFFFFF' }} /> : 'Login'}
                      </Button>

                      <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '13px', color: '#86868B', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                          Want to register a TODA?
                          <Box
                            component="span"
                            onClick={() => {
                              setLocalError(null);
                              setLocalSuccess(null);
                              setMode('signup_toda');
                            }}
                            sx={{
                              fontWeight: 700,
                              color: '#FF6B00',
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            Register
                          </Box>
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* TODA Registration Form */}
                {mode === 'signup_toda' && !authSuccessLoading && (
                  <Fade in={true} timeout={400}>
                    <Box sx={{ width: '100%', display: 'flex', flexGrow: 1, flexDirection: 'column' }}>
                      <TodaRegistrationFlow onBackToLogin={() => setMode('signin')} />
                    </Box>
                  </Fade>
                )}

                {/* Successful Login Loading Screen */}
                {authSuccessLoading && (
                  <Fade in={true} timeout={600}>
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                      <Box component="img" src={logoTextOrange} alt="SAKAY" sx={{ height: 28, mb: 4, objectFit: 'contain' }} />
                      <CircularProgress size={28} sx={{ color: '#FF6B00', mb: 2 }} />
                      <Typography sx={{ fontSize: '14px', color: '#86868B', fontWeight: 500 }}>
                        Signing into SAKAY LGU Portal...
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </Box>
            </Box>

            {/* Right Graphic Hero Pane */}
            {mode === 'signin' && (
              <Box
                sx={{
                  flex: '1 1 50%',
                  maxWidth: '50%',
                  display: { xs: 'none', md: 'flex' },
                  position: 'relative',
                  background: 'linear-gradient(135deg, #FAF8F5 0%, #F5F5F7 100%)',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  component="img"
                  src={splashBg}
                  alt="SAKAY Background"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.95,
                  }}
                />
              </Box>
            )}
          </Paper>
        </Box>

        {/* External Terms Text */}
        {mode === 'signin' && !authSuccessLoading && (
          <Fade in={true} timeout={800}>
            <Typography sx={{ mt: 3, textAlign: 'center', fontSize: '13px', color: '#86868B' }}>
              By clicking continue, you agree to our{' '}
              <Box component="span" sx={{ color: '#1D1D1F', textDecoration: 'underline', cursor: 'pointer' }}>
                Terms of Service
              </Box>{' '}
              and{' '}
              <Box component="span" sx={{ color: '#1D1D1F', textDecoration: 'underline', cursor: 'pointer' }}>
                Privacy Policy
              </Box>
              .
            </Typography>
          </Fade>
        )}
      </Box>

      {/* Global Snackbar for Form-Level Warnings */}
      <Snackbar
        open={!!displayError || !!localSuccess}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 2 }}
      >
        {displayError ? (
          <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid #FFE5E5', backgroundColor: '#FFF2F2' }}>
            <ErrorOutlineIcon sx={{ color: '#D92D20', fontSize: '20px' }} />
            <Typography sx={{ color: '#D92D20', fontSize: '14px', fontWeight: 500 }}>{displayError}</Typography>
          </Paper>
        ) : localSuccess ? (
          <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid #D1FADF', backgroundColor: '#ECFDF3' }}>
            <ErrorOutlineIcon sx={{ color: '#027A48', fontSize: '20px' }} />
            <Typography sx={{ color: '#027A48', fontSize: '14px', fontWeight: 500 }}>{localSuccess}</Typography>
          </Paper>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};
