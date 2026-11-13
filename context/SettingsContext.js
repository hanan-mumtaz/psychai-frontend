import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getBiometricsEnabled, 
  saveBiometricsEnabled, 
  getBiometricTipDismissed, 
  saveBiometricTipDismissed, 
  authenticateWithBiometrics 
} from '../services/BiometricService';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  notifications: true,
  highRiskAlert: true,
  autoReport: false,
  biometric: false, // OFF by default as requested
  biometricTipDismissed: false,
  retention: '90 DAYS',
  language: 'ENGLISH',
  telemetryFormat: 'PDF + JSON CORE',
};

export const SettingsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(DEFAULT_SETTINGS.notifications);
  const [highRiskAlert, setHighRiskAlert] = useState(DEFAULT_SETTINGS.highRiskAlert);
  const [autoReport, setAutoReport] = useState(DEFAULT_SETTINGS.autoReport);
  const [biometric, setBiometric] = useState(DEFAULT_SETTINGS.biometric);
  const [biometricTipDismissed, setBiometricTipDismissedState] = useState(DEFAULT_SETTINGS.biometricTipDismissed);
  const [retention, setRetention] = useState(DEFAULT_SETTINGS.retention);
  const [language, setLanguage] = useState(DEFAULT_SETTINGS.language);
  const [telemetryFormat, setTelemetryFormat] = useState(DEFAULT_SETTINGS.telemetryFormat);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage (Native) / localStorage (Web)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const bioEnabled = await getBiometricsEnabled();
        const tipDismissed = await getBiometricTipDismissed();
        setBiometric(bioEnabled);
        setBiometricTipDismissedState(tipDismissed);

        const onboardingVal = await AsyncStorage.getItem('@psych_ai_has_seen_onboarding');
        if (onboardingVal !== null) {
          setHasSeenOnboardingState(onboardingVal === 'true');
        } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const webVal = window.localStorage.getItem('@psych_ai_has_seen_onboarding');
          setHasSeenOnboardingState(webVal === 'true');
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const saved = window.localStorage.getItem('psych_ai_settings');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.notifications !== undefined) setNotifications(parsed.notifications);
            if (parsed.highRiskAlert !== undefined) setHighRiskAlert(parsed.highRiskAlert);
            if (parsed.autoReport !== undefined) setAutoReport(parsed.autoReport);
            if (parsed.retention) setRetention(parsed.retention);
            if (parsed.language) setLanguage(parsed.language);
            if (parsed.telemetryFormat) setTelemetryFormat(parsed.telemetryFormat);
          }
        }
      } catch (e) {
        console.warn('Could not load settings from storage', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Update Biometrics toggle with persistence
  const updateBiometric = async (enabled) => {
    setBiometric(enabled);
    await saveBiometricsEnabled(enabled);
  };

  // Turn on Biometrics with native authentication verification
  const enableBiometricsWithPrompt = async () => {
    const auth = await authenticateWithBiometrics(
      "Verify Face ID / Fingerprint to enable Biometric Security",
      "Enter Passcode"
    );
    if (auth.success) {
      await updateBiometric(true);
      await setBiometricTipDismissed(true);
      return { success: true, biometricType: auth.biometricType };
    }
    return { success: false, error: auth.error };
  };

  // Dismiss security tip permanently
  const setBiometricTipDismissed = async (dismissed) => {
    setBiometricTipDismissedState(dismissed);
    await saveBiometricTipDismissed(dismissed);
  };

  // Sync general settings to web storage
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          'psych_ai_settings',
          JSON.stringify({
            notifications,
            highRiskAlert,
            autoReport,
            biometric,
            retention,
            language,
            telemetryFormat,
          })
        );
      } catch (e) {
        console.warn('Could not persist settings', e);
      }
    }
  }, [notifications, highRiskAlert, autoReport, biometric, retention, language, telemetryFormat]);

  // Complete Onboarding
  const completeOnboarding = async () => {
    setHasSeenOnboardingState(true);
    try {
      await AsyncStorage.setItem('@psych_ai_has_seen_onboarding', 'true');
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('@psych_ai_has_seen_onboarding', 'true');
      }
    } catch (e) {
      console.warn("Could not save onboarding status", e);
    }
  };

  // Reset Onboarding (allows re-taking tour)
  const resetOnboarding = async () => {
    setHasSeenOnboardingState(false);
    try {
      await AsyncStorage.removeItem('@psych_ai_has_seen_onboarding');
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('@psych_ai_has_seen_onboarding');
      }
    } catch (e) {
      console.warn("Could not reset onboarding", e);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        isLoaded,
        hasSeenOnboarding,
        completeOnboarding,
        resetOnboarding,
        notifications,
        setNotifications,
        highRiskAlert,
        setHighRiskAlert,
        autoReport,
        setAutoReport,
        biometric,
        setBiometric: updateBiometric,
        enableBiometricsWithPrompt,
        biometricTipDismissed,
        setBiometricTipDismissed,
        retention,
        setRetention,
        language,
        setLanguage,
        telemetryFormat,
        setTelemetryFormat,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
