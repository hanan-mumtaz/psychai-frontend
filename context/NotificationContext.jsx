import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NotificationContext = createContext({
  showToast: () => {},
  showAlert: () => {},
  hideAlert: () => {},
});

// Singleton reference so non-hook code or drop-in helper can trigger notifications
let globalNotificationHandler = null;

export const InAppAlert = {
  alert: (title, message, buttons, options = {}) => {
    if (globalNotificationHandler) {
      globalNotificationHandler.showAlert({ title, message, buttons, ...options });
    } else {
      console.warn("NotificationProvider not mounted yet. Title:", title);
    }
  },
  toast: (title, message, type = 'info', duration = 3500) => {
    if (globalNotificationHandler) {
      globalNotificationHandler.showToast({ title, message, type, duration });
    } else {
      console.log(`[Toast ${type}]: ${title} - ${message}`);
    }
  }
};

export const NotificationProvider = ({ children }) => {
  const { theme } = useTheme();

  // Toast State
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-120)).current;
  const toastTimer = useRef(null);

  // Modal Alert State
  const [alertConfig, setAlertConfig] = useState(null);
  const alertScaleAnim = useRef(new Animated.Value(0.85)).current;
  const alertFadeAnim = useRef(new Animated.Value(0)).current;

  // Auto-determine type from title / message keywords
  const inferType = (title = '', message = '', explicitType) => {
    if (explicitType) return explicitType;
    const combined = `${title} ${message}`.toLowerCase();
    if (combined.includes('biometric') || combined.includes('face id') || combined.includes('fingerprint')) return 'biometric';
    if (combined.includes('error') || combined.includes('fail') || combined.includes('denied') || combined.includes('purge') || combined.includes('erase')) return 'error';
    if (combined.includes('success') || combined.includes('complete') || combined.includes('saved') || combined.includes('enabled') || combined.includes('active') || combined.includes('created')) return 'success';
    if (combined.includes('warning') || combined.includes('caution') || combined.includes('required')) return 'warning';
    return 'info';
  };

  const showToast = useCallback(({ title, message, type, duration = 3500 }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);

    const resolvedType = inferType(title, message, type);
    setToast({ title, message, type: resolvedType });

    Animated.spring(toastAnim, {
      toValue: Platform.OS === 'ios' ? 50 : 30,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    toastTimer.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [toastAnim]);

  const hideToast = useCallback(() => {
    Animated.timing(toastAnim, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [toastAnim]);

  const showAlert = useCallback(({ title, message, buttons, type }) => {
    const resolvedType = inferType(title, message, type);
    
    // Default OK button if none provided
    const resolvedButtons = (!buttons || buttons.length === 0)
      ? [{ text: 'OK', onPress: () => hideAlert() }]
      : buttons;

    setAlertConfig({
      title,
      message,
      buttons: resolvedButtons,
      type: resolvedType
    });

    alertScaleAnim.setValue(0.85);
    alertFadeAnim.setValue(0);

    Animated.parallel([
      Animated.spring(alertScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(alertFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [alertScaleAnim, alertFadeAnim]);

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(alertScaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(alertFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => setAlertConfig(null));
  }, [alertScaleAnim, alertFadeAnim]);

  // Bind global singleton handler
  globalNotificationHandler = {
    showToast,
    showAlert,
    hideAlert
  };

  const getIconConfig = (type) => {
    switch (type) {
      case 'biometric':
        return { name: 'finger-print', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' };
      case 'success':
        return { name: 'checkmark-circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'error':
        return { name: 'alert-circle', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'warning':
        return { name: 'warning', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
      default:
        return { name: 'shield-checkmark', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)' };
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, hideAlert }}>
      {children}

      {/* --- IN-APP TOAST POPUP BANNER --- */}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: toastAnim }],
              backgroundColor: theme.isDark ? '#141418' : '#FFFFFF',
              borderColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)',
              shadowColor: theme.isDark ? '#000000' : '#64748B',
            }
          ]}
        >
          <View style={[styles.toastIconBox, { backgroundColor: getIconConfig(toast.type).bg }]}>
            <Ionicons
              name={getIconConfig(toast.type).name}
              size={20}
              color={getIconConfig(toast.type).color}
            />
          </View>
          <View style={styles.toastTextContainer}>
            {toast.title ? (
              <Text style={[styles.toastTitle, { color: theme.isDark ? '#FAFAFA' : '#0F172A' }]}>
                {toast.title}
              </Text>
            ) : null}
            <Text style={[styles.toastMessage, { color: theme.isDark ? '#A1A1AA' : '#475569' }]} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
          <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={theme.isDark ? '#71717A' : '#94A3B8'} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* --- IN-APP DESIGNED MODAL ALERT DIALOG --- */}
      <Modal
        visible={!!alertConfig}
        transparent
        animationType="none"
        onRequestClose={hideAlert}
      >
        <TouchableWithoutFeedback onPress={hideAlert}>
          <Animated.View
            style={[
              styles.modalBackdrop,
              { opacity: alertFadeAnim }
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalCard,
                  {
                    transform: [{ scale: alertScaleAnim }],
                    backgroundColor: theme.isDark ? '#16161A' : '#FFFFFF',
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  }
                ]}
              >
                {/* Header Icon */}
                {alertConfig && (
                  <View
                    style={[
                      styles.modalIconCircle,
                      {
                        backgroundColor: getIconConfig(alertConfig.type).bg,
                        borderColor: getIconConfig(alertConfig.type).border,
                      }
                    ]}
                  >
                    <Ionicons
                      name={getIconConfig(alertConfig.type).name}
                      size={32}
                      color={getIconConfig(alertConfig.type).color}
                    />
                  </View>
                )}

                {/* Title */}
                <Text style={[styles.modalTitle, { color: theme.isDark ? '#FAFAFA' : '#0F172A' }]}>
                  {alertConfig?.title}
                </Text>

                {/* Message */}
                <Text style={[styles.modalMessage, { color: theme.isDark ? '#A1A1AA' : '#475569' }]}>
                  {alertConfig?.message}
                </Text>

                {/* Buttons */}
                <View style={styles.modalButtonsContainer}>
                  {alertConfig?.buttons?.map((btn, idx) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    
                    let btnBg = theme.isDark ? '#FAFAFA' : '#0F172A';
                    let btnTextColor = theme.isDark ? '#09090B' : '#FFFFFF';
                    let btnBorderColor = 'transparent';

                    if (isCancel) {
                      btnBg = 'transparent';
                      btnTextColor = theme.isDark ? '#A1A1AA' : '#64748B';
                      btnBorderColor = theme.isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1';
                    } else if (isDestructive) {
                      btnBg = '#DC2626';
                      btnTextColor = '#FFFFFF';
                    }

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.modalButton,
                          {
                            backgroundColor: btnBg,
                            borderColor: btnBorderColor,
                            borderWidth: isCancel ? 1 : 0,
                            flex: alertConfig.buttons.length > 2 ? undefined : 1,
                            marginHorizontal: alertConfig.buttons.length > 2 ? 0 : 4,
                            marginVertical: alertConfig.buttons.length > 2 ? 4 : 0,
                          }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          hideAlert();
                          if (btn.onPress) btn.onPress();
                        }}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            { color: btnTextColor, fontWeight: isCancel ? '600' : '700' }
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

const styles = StyleSheet.create({
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  toastIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  toastMessage: {
    fontSize: 12.5,
    lineHeight: 17,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  modalButton: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
});

