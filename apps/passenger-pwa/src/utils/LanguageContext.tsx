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
    registerTitle: "Gumawa ng Account ng Pasahero",
    registerSubtitle: "Ilagay ang inyong impormasyon upang magparehistro.",
    fullName: "Buong Pangalan",
    firstName: "Unang Pangalan",
    middleName: "Gitnang Pangalan",
    lastName: "Apelyido",
    suffix: "Suffix",
    mobileNumber: "Numero ng Telepono",
    confirmPassword: "Kumpirmahin ang Password",
    createAccountBtn: "Magpatuloy",
    backToLogin: "Bumalik sa Login",
    phoneRequired: "Kailangan ang mobile number",
    passwordRequired: "Kailangan ang password",
    nameRequired: "Kailangan ang buong pangalan",
    passwordsMustMatch: "Dapat magtugma ang password",
    successLogin: "Matagumpay na nakapag-login!",
    successRegister: "Matagumpay na nakapag-register!",
    termsTitle: "Mga Tuntunin ng Serbisyo",
    privacyTitle: "Patakaran sa Privacy",
    iAgree: "Sumasang-ayon ako",
    lastUpdatedTerms: "Huling binago: Hulyo 2026",
    termsNotice: "Sa pagpapatuloy, sumasang-ayon ka sa",
    and: "at",
    accountAlreadyRegistered: "Nakapagrehistro na ang account na ito.",
    otpAlreadySent: "Naipadala na ang verification code.",
    notificationsTitle: "Mga Notification",
    markAllAsRead: "Markahan lahat bilang nabasa",
    noNotifications: "Walang mga notification.",
    close: "Isara",
    helpAndSupport: "Tulong at Suporta",
    unread: "Hindi pa nababasa",
    read: "Nabasa na",
    addPlace: "Magdagdag ng Lugar",
    placeName: "Pangalan ng Lugar",
    enterAddress: "Ilagay ang address o landmark",
    selectOnMap: "Pumili sa Mapa",
    savePlace: "I-save ang Lugar",
    incompleteInfo: "Hindi pa kumpleto ang impormasyon.",
    savedPlaces: "Nai-save na Lugar",
    recenterMap: "Bumalik sa Gitna",
    useCurrentLocation: "Gamitin ang Kasalukuyang Lokasyon",
    cancel: "Kanselahin",
    searchLocation: "Maghanap ng lugar...",
    otpLocked: "Naka-lock ang OTP dahil sa maraming maling pagsubok. Subukang muli mamaya.",
    under12Block: "Ang mga pasaherong wala pang 12 taong gulang ay hindi maaaring magkaroon ng verified account.",
    sessionInvalidated: "Natapos na ang iyong session dahil may nag-login sa ibang device.",
    alreadyPendingRegistration: "May naghihintay na rehistrasyon para sa numerong ito.",
    otpResendCooldown: "Maghintay bago humingi muli ng OTP.",
    otpDailyCapReached: "Naabot na ang limitasyon ng OTP ngayong araw. Subukan bukas.",
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
    registerTitle: "Create Passenger Account",
    registerSubtitle: "Enter your information to register.",
    fullName: "Full Name",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    suffix: "Suffix",
    mobileNumber: "Mobile Number",
    confirmPassword: "Confirm Password",
    createAccountBtn: "Continue",
    backToLogin: "Back to Login",
    phoneRequired: "Mobile number is required",
    passwordRequired: "Password is required",
    nameRequired: "Full name is required",
    passwordsMustMatch: "Passwords must match",
    successLogin: "Successfully logged in!",
    successRegister: "Successfully registered!",
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    iAgree: "I agree",
    lastUpdatedTerms: "Last updated: July 2026",
    termsNotice: "By continuing, you agree to",
    and: "and",
    accountAlreadyRegistered: "This account is already registered.",
    otpAlreadySent: "The verification code has already been sent.",
    notificationsTitle: "Notifications",
    markAllAsRead: "Mark all as read",
    noNotifications: "No notifications.",
    close: "Close",
    helpAndSupport: "Help & Support",
    unread: "Unread",
    read: "Read",
    addPlace: "Add Place",
    placeName: "Place Name",
    enterAddress: "Enter address or landmark",
    selectOnMap: "Select on Map",
    savePlace: "Save Location",
    incompleteInfo: "Information is incomplete.",
    savedPlaces: "Saved Places",
    recenterMap: "Recenter Map",
    useCurrentLocation: "Use Current Location",
    cancel: "Cancel",
    searchLocation: "Search location...",
    otpLocked: "OTP is locked due to too many failed attempts. Please try again later.",
    under12Block: "Passengers under 12 years old cannot hold a verified account.",
    sessionInvalidated: "Your session has expired because you logged in from another device.",
    alreadyPendingRegistration: "A registration is already pending for this number.",
    otpResendCooldown: "Please wait before requesting another OTP.",
    otpDailyCapReached: "Daily OTP limit reached. Please try again tomorrow.",
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
    return (saved === 'tl' || saved === 'en') ? saved : 'tl';
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
