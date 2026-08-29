/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'tl' | 'en';

const translations = {
  tl: {
    start: "Magsimula na",
    hasAccount: "May account na?",
    loginLink: " Mag-login",
    selectRole: "Paano mo gustong gamitin ang SAKAY?",
    selectRoleDesc: "Pumili ng uri ng account para makapagsimula. Maaari kang magparehistro bilang pasahero o drayber.",
    passenger: "Pasahero",
    passengerDesc: "Mag-book ng tricycle sa paligid ng Calapan City",
    driver: "Drayber",
    driverDesc: "Tumanggap ng mga booking at pamahalaan ang iyong mga biyahe",
    continue: "Magpatuloy",
    skip: "Laktawan",
    back: "Bumalik",
    loginTitle: "Maligayang pagbalik!",
    loginSubtitle: "Mag-login para makapag-book ng biyahe!",
    phoneOrEmail: "Email o Mobile Number",
    password: "Password",
    forgotPassword: "Nakalimutan ang password?",
    dontHaveAccount: "Wala pang account?",
    registerLink: " Gumawa ng account",
    registerTitle: "Gumawa ng Account",
    registerSubtitle: "Magparehistro para makapagsimula",
    fullName: "Buong Pangalan",
    confirmPassword: "Kumpirmahin ang Password",
    createAccountBtn: "Gumawa ng account",
    backToLogin: "Bumalik sa Login",
    phoneRequired: "Kailangan ang email o mobile number",
    passwordRequired: "Kailangan ang password",
    nameRequired: "Kailangan ang buong pangalan",
    passwordsMustMatch: "Dapat magtugma ang password",
    successLogin: "Matagumpay na nakapag-login!",
    successRegister: "Matagumpay na nakapag-register!",
  },
  en: {
    start: "Get Started",
    hasAccount: "Already have an account?",
    loginLink: " Login",
    selectRole: "How would you like to use SAKAY?",
    selectRoleDesc: "Choose an account type to get started. You can register as a passenger or driver.",
    passenger: "Passenger",
    passengerDesc: "Book tricycles around Calapan City",
    driver: "Driver",
    driverDesc: "Accept bookings and manage your trips",
    continue: "Continue",
    skip: "Skip",
    back: "Back",
    loginTitle: "Welcome back!",
    loginSubtitle: "Login to start booking rides!",
    phoneOrEmail: "Email or Mobile Number",
    password: "Password",
    forgotPassword: "Forgot password?",
    dontHaveAccount: "Don't have an account?",
    registerLink: " Create an account",
    registerTitle: "Create an Account",
    registerSubtitle: "Register to get started",
    fullName: "Full Name",
    confirmPassword: "Confirm Password",
    createAccountBtn: "Create Account",
    backToLogin: "Back to Login",
    phoneRequired: "Mobile number or email is required",
    passwordRequired: "Password is required",
    nameRequired: "Full name is required",
    passwordsMustMatch: "Passwords must match",
    successLogin: "Successfully logged in!",
    successRegister: "Successfully registered!",
  }
};

interface LanguageContextType {
  language: Language;
  t: typeof translations['en'];
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sakay_language');
    return (saved === 'tl' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sakay_language', lang);
  };

  const value = {
    language,
    t: translations[language],
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
