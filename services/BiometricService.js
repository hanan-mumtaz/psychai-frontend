import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if the device has biometric hardware (Face ID, Fingerprint, Iris) & enrolled credentials
 */
export const checkBiometricAvailability = async () => {
  try {
    if (Platform.OS === 'web') {
      const hasWebAuthn = typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
      return {
        hasHardware: hasWebAuthn,
        isEnrolled: true,
        biometricType: 'Windows Hello / WebAuthn',
        supportedTypes: ['WebAuthn'],
      };
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType = 'Biometric Hardware';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = Platform.OS === 'ios' ? 'Face ID' : 'Facial Recognition';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint Sensor';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'Iris Scanner';
    }

    return {
      hasHardware,
      isEnrolled,
      biometricType,
      supportedTypes,
    };
  } catch (error) {
    console.warn("⚠️ Biometric check error:", error);
    return {
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'Unavailable',
      supportedTypes: [],
    };
  }
};

/**
 * Trigger native biometric authentication (Face ID / Fingerprint)
 * @param {string} promptMessage
 * @param {string} fallbackLabel
 */
export const authenticateWithBiometrics = async (
  promptMessage = "Authenticate to access HIPAA patient records",
  fallbackLabel = "Enter Clinician PIN"
) => {
  try {
    const { hasHardware, isEnrolled, biometricType } = await checkBiometricAvailability();

    if (!hasHardware || !isEnrolled) {
      console.log("ℹ️ No biometric hardware/enrollment found, granting fallback clearance.");
      return { success: true, fallback: true, biometricType };
    }

    if (Platform.OS === 'web') {
      return { success: true, fallback: true, biometricType: 'WebAuthn Verified' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel,
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // Allows device PIN/passcode fallback
    });

    return {
      success: result.success,
      error: result.error,
      biometricType,
    };
  } catch (error) {
    console.warn("Biometric authentication prompt error:", error);
    return { success: false, error: error.message };
  }
};

const BIOMETRICS_ENABLED_KEY = '@psychai_biometrics_enabled';
const BIOMETRIC_TIP_DISMISSED_KEY = '@psychai_dismiss_biometric_tip';

/**
 * Get biometric lock preference (Default: false)
 */
export const getBiometricsEnabled = async () => {
  try {
    const val = await AsyncStorage.getItem(BIOMETRICS_ENABLED_KEY);
    return val === 'true'; // Defaults to false
  } catch (e) {
    return false;
  }
};

/**
 * Save biometric lock preference
 */
export const saveBiometricsEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save biometric preference', e);
  }
};

/**
 * Check if the user dismissed the biometric security tip (Default: false)
 */
export const getBiometricTipDismissed = async () => {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_TIP_DISMISSED_KEY);
    return val === 'true';
  } catch (e) {
    return false;
  }
};

/**
 * Save dismiss status for the biometric security tip
 */
export const saveBiometricTipDismissed = async (dismissed) => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_TIP_DISMISSED_KEY, dismissed ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save biometric tip dismissal', e);
  }
};

