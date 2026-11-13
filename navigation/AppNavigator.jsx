import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, AppState, Image, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Import Screens
import ClinicalDashboard from '../src/screens/ClinicalDashboard';
import SessionDetail     from '../src/screens/SessionDetail';
import NewSession        from '../src/screens/NewSession';
import ExportReport      from '../src/screens/ExportReport';
import AnalyticsScreen   from '../src/screens/AnalyticsScreen';
import ProfileScreen     from '../src/screens/ProfileScreen';
import AuthScreen        from '../src/screens/AuthScreen';
import GetStartedScreen  from '../src/screens/GetStartedScreen';

// Import Contexts & Services
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { authenticateWithBiometrics, checkBiometricAvailability } from '../services/BiometricService';

const Tab       = createBottomTabNavigator();
const Stack     = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeDashboard" component={ClinicalDashboard} />
      <Stack.Screen name="SessionDetail" component={SessionDetail} />
      <Stack.Screen name="NewSession"    component={NewSession} />
      <Stack.Screen name="ExportReport"  component={ExportReport} />
      <Stack.Screen name="Auth"          component={AuthScreen} />
    </Stack.Navigator>
  );
}

function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AnalyticsOverview" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
      <Stack.Screen name="Auth"        component={AuthScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          Platform.OS === 'web' && { backgroundColor: theme.surface }
        ],
        tabBarBackground: () => (
          Platform.OS === 'web' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface }]} />
          ) : (
            <BlurView 
              intensity={theme.isDark ? 80 : 95} 
              tint={theme.isDark ? "dark" : "light"} 
              style={StyleSheet.absoluteFill} 
            />
          )
        ),
        tabBarActiveTintColor: theme.primary,     
        tabBarInactiveTintColor: theme.secondary, 
        tabBarLabelStyle: styles.tabLabel,
        
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return focused 
              ? <Ionicons name="medical" size={20} color={color} />
              : <Ionicons name="medical-outline" size={20} color={color} />;
          } else if (route.name === 'Analytics') {
            return <Feather name="bar-chart-2" size={20} color={color} />;
          } else if (route.name === 'Profile') {
            return <Feather name="user" size={20} color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="Home"      component={DashboardStack} options={{ title: 'Sessions' }} />
      <Tab.Screen name="Analytics" component={AnalyticsStack} />
      <Tab.Screen name="Profile"   component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { biometric, isLoaded, hasSeenOnboarding } = useSettings();
  const styles = getStyles(theme);

  const [isLocked, setIsLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricName, setBiometricName] = useState('Face ID / Fingerprint');
  const appState = useRef(AppState.currentState);

  // Check biometric sensor type
  useEffect(() => {
    checkBiometricAvailability().then(info => {
      if (info && info.biometricType) {
        setBiometricName(info.biometricType);
      }
    });
  }, []);

  // Handle Startup Lock
  useEffect(() => {
    if (isLoaded && biometric) {
      setIsLocked(true);
      triggerUnlock();
    } else {
      setIsLocked(false);
    }
  }, [isLoaded, biometric]);

  // Handle AppState Resume Lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        biometric
      ) {
        setIsLocked(true);
        triggerUnlock();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [biometric]);

  const triggerUnlock = async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const res = await authenticateWithBiometrics(
        "Unlock Psych.ai Clinical Workspace",
        "Enter Device Passcode"
      );
      if (res.success) {
        setIsLocked(false);
      }
    } catch (e) {
      console.warn("Biometric unlock error", e);
    } finally {
      setAuthenticating(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: theme.background }]}>
        <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.lockContent}>
          <View style={[styles.shieldCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="lock-closed" size={38} color={theme.primary} />
          </View>

          <Text style={[styles.lockTitle, { color: theme.primary }]}>Workspace Locked</Text>
          <Text style={[styles.lockSub, { color: theme.secondary }]}>
            Biometric authentication ({biometricName}) is active to safeguard protected patient telemetry under HIPAA §164.312.
          </Text>

          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: theme.primary }]}
            onPress={triggerUnlock}
            disabled={authenticating}
            activeOpacity={0.8}
          >
            {authenticating ? (
              <ActivityIndicator color={theme.background} size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="finger-print" size={18} color={theme.background} style={{ marginRight: 8 }} />
                <Text style={[styles.unlockBtnText, { color: theme.background }]}>
                  UNLOCK WORKSPACE
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasSeenOnboarding ? "MainTabs" : "GetStarted"}
    >
      <RootStack.Screen name="GetStarted" component={GetStartedScreen} />
      <RootStack.Screen name="MainTabs"   component={MainTabs} />
      <RootStack.Screen name="Auth"       component={AuthScreen} />
    </RootStack.Navigator>
  );
}

// --- STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: 'transparent',
    elevation: 0,
    height: Platform.OS === 'ios' ? 84 : 79,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: theme.isDark ? 0 : 0.03,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  lockContent: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockSub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  unlockBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  unlockBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});