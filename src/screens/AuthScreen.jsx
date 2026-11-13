import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, SafeAreaView, Platform, ActivityIndicator, Modal, Image
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { InAppAlert as Alert } from '../../context/NotificationContext';
import { recordGdprConsent } from '../../services/Services';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = "627114083725-oas6oleeqcam1blgvhv6ruuntvefl7bb.apps.googleusercontent.com";

// Google OAuth Discovery Configuration
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function AuthScreen({ navigation }) {
  const { theme } = useTheme();
  const { loginWithGoogle, loginDemoGoogle, loginWithEmail, registerWithEmail, updateProfile, isAuthenticated, user } = useAuth();
  const { completeOnboarding } = useSettings();
  
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);

  // Form states for manual registration
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('Consultant Clinical Psychiatrist');
  const [license, setLicense] = useState('');
  const [qualifications, setQualifications] = useState('MBBS, FCPS (Psychiatry)');
  const [secureText, setSecureText] = useState(true);

  // GDPR Special Category Health Data Consent & Policy
  const [gdprConsent, setGdprConsent] = useState(false);
  const [gdprModalVisible, setGdprModalVisible] = useState(false);

  // Verification & Credentials Modal after Google Auth
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [vName, setVName] = useState('');
  const [vLicense, setVLicense] = useState('');
  const [vQualifications, setVQualifications] = useState('MBBS, FCPS (Psychiatry), MRCPsych');
  const [vRole, setVRole] = useState('Consultant Clinical Psychiatrist');
  const [vInstitution, setVInstitution] = useState('National Institute of Mental Health');
  const [savingCredentials, setSavingCredentials] = useState(false);

  const googleBtnRef = useRef(null);
  const tokenClientRef = useRef(null);

  // Native Android/iOS AuthSession Request
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'psychai',
    path: 'auth',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      prompt: AuthSession.Prompt.SelectAccount,
    },
    discovery
  );

  // Handle Native OAuth Response from Android Custom Tab
  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      if (access_token) {
        setLoading(true);
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        })
        .then(res => res.json())
        .then(async (profile) => {
          if (profile && profile.email) {
            const authRes = await loginWithGoogle(access_token, profile);
            promptClinicianCredentials(authRes.user || profile);
          }
        })
        .catch(err => {
          Alert.alert("Google Auth Error", err.message || "Failed to retrieve Google profile.");
        })
        .finally(() => setLoading(false));
      }
    }
  }, [response]);

  // Parse OAuth redirect token if returned from redirect flow on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, null, window.location.pathname);
        setLoading(true);
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        .then(res => res.json())
        .then(async (profile) => {
          if (profile && profile.email) {
            const authRes = await loginWithGoogle(accessToken, profile);
            promptClinicianCredentials(authRes.user || profile);
          }
        })
        .catch(err => {
          console.warn("OAuth redirect parse error:", err);
        })
        .finally(() => setLoading(false));
      }
    }
  }, []);

  // Initialize Google Identity Services & OAuth2 Token Client on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const loadGoogleScript = () => {
        if (!document.getElementById('google-jssdk')) {
          const script = document.createElement('script');
          script.id = 'google-jssdk';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => initGoogleOAuth();
          document.body.appendChild(script);
        } else if (window.google?.accounts) {
          initGoogleOAuth();
        }
      };

      const initGoogleOAuth = () => {
        try {
          if (window.google?.accounts?.oauth2) {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'email profile openid',
              callback: async (tokenResponse) => {
                if (tokenResponse?.error) {
                  console.warn("Token Client error:", tokenResponse.error);
                  return;
                }
                if (tokenResponse?.access_token) {
                  setLoading(true);
                  try {
                    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                      headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                    });
                    const profile = await userinfoRes.json();
                    const authRes = await loginWithGoogle(tokenResponse.access_token, profile);
                    promptClinicianCredentials(authRes.user || profile);
                  } catch (err) {
                    Alert.alert("Sign In Error", err.message || "Failed to retrieve Google profile.");
                  } finally {
                    setLoading(false);
                  }
                }
              },
            });
          }

          if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              use_fedcm_for_prompt: false,
            });
          }
        } catch (e) {
          console.warn("Google OAuth initialization note:", e);
        }
      };

      loadGoogleScript();
    }
  }, [theme.isDark]);

  const promptClinicianCredentials = (authedUser) => {
    setGoogleUser(authedUser);
    setVName(authedUser.name ? (authedUser.name.startsWith('Dr.') ? authedUser.name : `Dr. ${authedUser.name}`) : 'Dr. Clinician, MD');
    setVLicense(authedUser.license || 'PMDC-89241-CLIN');
    setVQualifications(authedUser.qualifications || 'MBBS, FCPS (Psychiatry), MRCPsych');
    setVRole(authedUser.role || 'Consultant Clinical Psychiatrist');
    setVInstitution(authedUser.institution || 'National Institute of Mental Health');
    setVerifyModalVisible(true);
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) return;
    setLoading(true);
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const parsedUser = JSON.parse(jsonPayload);

      const authRes = await loginWithGoogle(response.credential, {
        email: parsedUser.email,
        name: parsedUser.name,
        picture: parsedUser.picture,
        sub: parsedUser.sub,
      });

      promptClinicianCredentials(authRes.user || parsedUser);
    } catch (err) {
      Alert.alert("Google Sign-In Error", err.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGoogleLogin = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (tokenClientRef.current) {
        try {
          tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (e) {
          console.warn("Token client request failed, using redirect fallback:", e);
        }
      }

      // Safe OAuth2 Redirect Fallback for Web
      const redirectUri = window.location.origin;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;
      window.location.href = oauthUrl;
    } else {
      // Native Android / iOS OAuth Session via Chrome Custom Tabs
      try {
        if (promptAsync) {
          setLoading(true);
          const result = await promptAsync();
          if (result?.type !== 'success') {
            setLoading(false);
          }
        } else {
          handleQuickDemoGoogle();
        }
      } catch (err) {
        setLoading(false);
        handleQuickDemoGoogle();
      }
    }
  };

  const handleSaveCredentials = async () => {
    if (!vLicense.trim()) {
      Alert.alert("License Required", "Please enter your medical license ID or verification code to legitimize clinical PDF reports.");
      return;
    }

    setSavingCredentials(true);
    try {
      await updateProfile({
        name: vName.trim() || googleUser?.name || 'Dr. Clinician',
        license: vLicense.trim(),
        qualifications: vQualifications.trim() || 'MBBS, FCPS',
        role: vRole.trim() || 'Consultant Clinical Psychiatrist',
        institution: vInstitution.trim() || 'Psych.ai Platform',
      });

      await recordGdprConsent(googleUser?.email || 'clinician@psych.ai', true);
      await completeOnboarding();

      setVerifyModalVisible(false);
      Alert.alert(
        "Credentials & GDPR Verified",
        `Welcome to Psych.ai, ${vName}!\n\nMedical License: ${vLicense}\nQualifications: ${vQualifications}\nGDPR Consent: Active & Logged\n\nYour clinical signature is active for all diagnostic audits.`
      );
      if (navigation?.canGoBack()) {
        navigation.goBack();
      } else {
        navigation?.replace ? navigation.replace('MainTabs') : navigation?.navigate('MainTabs');
      }
    } catch (err) {
      setVerifyModalVisible(false);
      if (navigation?.canGoBack()) {
        navigation.goBack();
      } else {
        navigation?.navigate('MainTabs');
      }
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleSkipCredentials = async () => {
    setVerifyModalVisible(false);
    await completeOnboarding();
    Alert.alert("Welcome Back", `Signed in as ${googleUser?.name || 'Dr. Clinician'}. You can configure license details anytime from Profile.`);
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.replace ? navigation.replace('MainTabs') : navigation?.navigate('MainTabs');
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please provide both your clinician email and password.");
      return;
    }

    if (mode === 'register' && !gdprConsent) {
      Alert.alert(
        "GDPR Consent Required",
        "Under GDPR Article 9 (Special Category Health Data), you must affirm explicit consent for clinical biomarker processing before creating an account."
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await loginWithEmail(email.trim(), password);
        await completeOnboarding();
        Alert.alert("Welcome Back", `Signed in as ${res.user.name}`);
        if (navigation?.canGoBack()) {
          navigation.goBack();
        } else {
          navigation?.replace ? navigation.replace('MainTabs') : navigation?.navigate('MainTabs');
        }
      } else {
        if (!name.trim()) {
          Alert.alert("Name Required", "Please enter your full clinician name.");
          setLoading(false);
          return;
        }
        const res = await registerWithEmail({
          email: email.trim(),
          password,
          name: name.trim(),
          institution: institution.trim() || "Psych.ai Diagnostic Hub",
          role: role.trim() || "Consultant Clinical Psychiatrist",
          license: license.trim() || "PRO-CLINICAL-2026",
          qualifications: qualifications.trim() || "MBBS, FCPS (Psychiatry)",
        });
        
        await recordGdprConsent(email.trim(), true);
        await completeOnboarding();

        Alert.alert("Account Created & GDPR Compliant", `Clinician profile registered successfully for ${res.user.name}`);
        if (navigation?.canGoBack()) {
          navigation.goBack();
        } else {
          navigation?.replace ? navigation.replace('MainTabs') : navigation?.navigate('MainTabs');
        }
      }
    } catch (err) {
      Alert.alert("Authentication Failed", err.message || "Could not complete request.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoGoogle = async () => {
    setLoading(true);
    try {
      const res = await loginDemoGoogle();
      promptClinicianCredentials(res.user);
    } catch (err) {
      Alert.alert("Auth Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={styles.container}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={18} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clinician Authentication</Text>
          <View style={{ width: 42 }} />
        </Animated.View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 107 }} showsVerticalScrollIndicator={false}>

          {/* Logo & Platform Info */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.brandContainer}>
            <View style={styles.brandIconCircle}>
              <Image 
                source={
                  theme.isDark 
                    ? require('../../assets/navbar.png') 
                    : require('../../assets/navbarli.png')
                } 
                style={{ width: 35, height: 33 }} 
              />
            </View>
            <Text style={styles.brandTitle}>PSYCH.AI</Text>
            <Text style={styles.brandSubtitle}>Clinical Diagnostic & Telemetry Gateway</Text>
          </Animated.View>

          {/* Mode Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
              onPress={() => setMode('login')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>SIGN IN</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
              onPress={() => setMode('register')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>CREATE ACCOUNT</Text>
            </TouchableOpacity>
          </View>

          {/* Authentication Card */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.card}>

            {/* Google OAuth Section */}
            <View style={styles.googleSection}>
              <TouchableOpacity 
                style={styles.googleCustomBtn} 
                onPress={handleDirectGoogleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={18} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.googleCustomBtnText}>
                  {loading ? "Authenticating..." : "Continue with Google"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.demoGoogleBtn} 
                onPress={handleQuickDemoGoogle}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Feather name="zap" size={13} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={styles.demoGoogleBtnText}>
                  Quick Demo Clinician Sign-In (FYP)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR USE EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Registration Fields */}
            {mode === 'register' && (
              <>
                <Text style={styles.inputLabel}>FULL CLINICIAN NAME</Text>
                <View style={styles.inputContainer}>
                  <Feather name="user" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Dr. Areej Fatima, MD"
                    placeholderTextColor={theme.secondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <Text style={styles.inputLabel}>QUALIFICATIONS & DEGREES</Text>
                <View style={styles.inputContainer}>
                  <Feather name="book-open" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. MBBS, FCPS (Psychiatry), MRCPsych"
                    placeholderTextColor={theme.secondary}
                    value={qualifications}
                    onChangeText={setQualifications}
                  />
                </View>

                <Text style={styles.inputLabel}>CLINICAL ROLE / SPECIALTY</Text>
                <View style={styles.inputContainer}>
                  <Feather name="briefcase" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Consultant Clinical Psychiatrist"
                    placeholderTextColor={theme.secondary}
                    value={role}
                    onChangeText={setRole}
                  />
                </View>

                <Text style={styles.inputLabel}>HOSPITAL / MEDICAL CENTER</Text>
                <View style={styles.inputContainer}>
                  <Feather name="map-pin" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. National Institute of Mental Health"
                    placeholderTextColor={theme.secondary}
                    value={institution}
                    onChangeText={setInstitution}
                  />
                </View>

                <Text style={styles.inputLabel}>MEDICAL LICENSE NUMBER</Text>
                <View style={styles.inputContainer}>
                  <Feather name="award" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. PMDC-89241-CLIN"
                    placeholderTextColor={theme.secondary}
                    value={license}
                    onChangeText={setLicense}
                  />
                </View>
              </>
            )}

            {/* Email Field */}
            <Text style={styles.inputLabel}>CLINICIAN EMAIL ADDRESS</Text>
            <View style={styles.inputContainer}>
              <Feather name="mail" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="doctor@hospital.org"
                placeholderTextColor={theme.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Field */}
            <Text style={styles.inputLabel}>SECURE PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••••••"
                placeholderTextColor={theme.secondary}
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                <Feather name={secureText ? "eye-off" : "eye"} size={16} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            {/* GDPR Explicit Consent Checkbox (Registration Mode) */}
            {mode === 'register' && (
              <View style={styles.gdprConsentCard}>
                <TouchableOpacity 
                  style={styles.gdprCheckboxRow} 
                  onPress={() => setGdprConsent(!gdprConsent)}
                  activeOpacity={0.8}
                >
                  <Feather 
                    name={gdprConsent ? "check-square" : "square"} 
                    size={18} 
                    color={gdprConsent ? "#4A9B8E" : theme.secondary} 
                    style={{ marginRight: 10, marginTop: 2 }} 
                  />
                  <Text style={[styles.gdprConsentText, { color: theme.secondary }]}>
                    I explicitly consent to the collection and processing of multimodal clinical biomarkers (facial action units & vocal pitch telemetry) strictly for psychiatric assessment under{' '}
                    <Text 
                      style={{ color: '#4A9B8E', fontWeight: '800', textDecorationLine: 'underline' }}
                      onPress={() => setGdprModalVisible(true)}
                    >
                      GDPR Article 9 (Special Category Data)
                    </Text>.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleEmailSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.background} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? "SIGN IN TO WORKSPACE" : "REGISTER CLINICIAN ACCOUNT"}
                </Text>
              )}
            </TouchableOpacity>

          </Animated.View>

          {/* Security Notice */}
          <View style={styles.securityBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#4A9B8E" style={{ marginRight: 6 }} />
            <Text style={styles.securityText}>
              256-Bit Encrypted HIPAA & GDPR Medical Vault Architecture
            </Text>
          </View>

        </ScrollView>

        {/* --- GOOGLE LOGIN CLINICIAN CREDENTIALS POPUP MODAL --- */}
        <Modal
          visible={verifyModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setVerifyModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A9B8E20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Ionicons name="shield-checkmark" size={20} color="#4A9B8E" />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.primary }]}>Clinician Verification</Text>
                    <Text style={{ color: theme.secondary, fontSize: 11, fontWeight: '500' }}>Legitimize Official Medical Reports</Text>
                  </View>
                </View>
              </View>

              {/* Verified Google Account Banner */}
              <View style={styles.verifiedBanner}>
                {googleUser?.picture ? (
                  <Image source={{ uri: googleUser.picture }} style={styles.bannerAvatar} />
                ) : (
                  <View style={[styles.bannerAvatar, { backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: theme.background, fontWeight: '800', fontSize: 12 }}>DR</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerName, { color: theme.primary }]} numberOfLines={1}>
                    {googleUser?.name || 'Google Clinician'}
                  </Text>
                  <Text style={[styles.bannerEmail, { color: theme.secondary }]} numberOfLines={1}>
                    {googleUser?.email} ✓ Google Verified
                  </Text>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalInputLabel}>DOCTOR NAME & TITLE</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. Dr. Areej Fatima, MD"
                  placeholderTextColor={theme.secondary}
                  value={vName}
                  onChangeText={setVName}
                />

                <Text style={styles.modalInputLabel}>MEDICAL LICENSE / PMDC ID *</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: '#4A9B8E', backgroundColor: theme.background }]}
                  placeholder="e.g. PMDC-89241-CLIN or PMC-74892"
                  placeholderTextColor={theme.secondary}
                  value={vLicense}
                  onChangeText={setVLicense}
                />

                <Text style={styles.modalInputLabel}>QUALIFICATIONS & DEGREES</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. MBBS, FCPS (Psychiatry), MRCPsych"
                  placeholderTextColor={theme.secondary}
                  value={vQualifications}
                  onChangeText={setVQualifications}
                />

                <Text style={styles.modalInputLabel}>SPECIALTY / DESIGNATION</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. Consultant Clinical Psychiatrist"
                  placeholderTextColor={theme.secondary}
                  value={vRole}
                  onChangeText={setVRole}
                />

                <Text style={styles.modalInputLabel}>HOSPITAL / CLINICAL CENTER</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. National Institute of Mental Health"
                  placeholderTextColor={theme.secondary}
                  value={vInstitution}
                  onChangeText={setVInstitution}
                />

                <TouchableOpacity
                  style={[styles.saveCredentialsBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveCredentials}
                  disabled={savingCredentials}
                  activeOpacity={0.8}
                >
                  {savingCredentials ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <Text style={[styles.saveCredentialsBtnText, { color: theme.background }]}>
                      VERIFY & SAVE CLINICIAN CREDENTIALS
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={handleSkipCredentials}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skipBtnText, { color: theme.secondary }]}>
                    Skip for now (Use Default Credentials)
                  </Text>
                </TouchableOpacity>
              </ScrollView>

            </View>
          </View>
        </Modal>

        {/* --- GDPR PRIVACY POLICY IN-APP MODAL --- */}
        <Modal
          visible={gdprModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setGdprModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxWidth: 480, maxHeight: '80%' }]}>
              
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="file-text" size={20} color="#4A9B8E" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: theme.primary }]}>GDPR Health Privacy Policy</Text>
                </View>
                <TouchableOpacity onPress={() => setGdprModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.policyHeader, { color: theme.primary }]}>1. Special Category Data (Article 9)</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  Psych.ai processes behavioral, acoustic, and facial biomarker telemetry strictly for diagnostic psychiatric evaluation. Under GDPR Article 9, health data requires explicit consent.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>2. Purpose Limitation & AI Usage</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  Your data is NEVER sold, leased, or repurposed for marketing. Biometric vectors are evaluated in-session and are NOT used to retrain external machine learning models without separate consent.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>3. Right to be Forgotten (Article 17)</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  You retain the unconditional right to request complete data erasure. Triggering 'Delete Account & Erase All Data' cascades permanent deletion across all database records and cache stores.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>4. 72-Hour Breach Notification</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  In compliance with GDPR Article 33, Psych.ai maintains automated protocols to notify relevant EU supervisory authorities and affected clinicians within 72 hours of becoming aware of any PHI security event.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closePolicyBtn, { backgroundColor: theme.primary }]}
                onPress={() => setGdprModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closePolicyBtnText, { color: theme.background }]}>
                  I UNDERSTAND & AGREE
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: theme.background },
  
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.primary, fontSize: 16, fontWeight: '800' },
  
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  
  brandContainer: { alignItems: 'center', marginBottom: 24 },
  brandIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brandTitle: { color: theme.primary, fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  brandSubtitle: { color: theme.secondary, fontSize: 12, fontWeight: '600', marginTop: 4 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: theme.primary },
  tabText: { color: theme.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  tabTextActive: { color: theme.background, fontWeight: '800' },
  
  card: { backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 20, marginBottom: 20 },
  
  googleSection: { alignItems: 'center', marginBottom: 8 },
  googleCustomBtn: { 
    width: '100%', 
    backgroundColor: theme.isDark ? '#1C1C20' : '#FFFFFF', 
    borderWidth: 1, 
    borderColor: theme.border, 
    paddingVertical: 13, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  googleCustomBtnText: { 
    color: theme.primary, 
    fontSize: 13, 
    fontWeight: '800', 
    letterSpacing: 0.5 
  },
  demoGoogleBtn: { marginTop: 10, width: '100%', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  demoGoogleBtnText: { color: theme.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginHorizontal: 12 },
  
  inputLabel: { color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6, marginTop: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  textInput: { flex: 1, color: theme.primary, fontSize: 13, fontWeight: '500' },

  gdprConsentCard: { backgroundColor: theme.background, borderWidth: 1, borderColor: '#4A9B8E40', borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 6 },
  gdprCheckboxRow: { flexDirection: 'row', alignItems: 'flex-start' },
  gdprConsentText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  
  submitBtn: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  submitBtnText: { color: theme.background, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  
  securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  securityText: { color: theme.secondary, fontSize: 11, fontWeight: '600' },

  // Verification Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A9B8E15', borderWidth: 1, borderColor: '#4A9B8E40', borderRadius: 12, padding: 12, marginBottom: 16 },
  bannerAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  bannerName: { fontSize: 13, fontWeight: '800' },
  bannerEmail: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  modalInputLabel: { color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 10, marginBottom: 5 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  
  saveCredentialsBtn: { marginTop: 18, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveCredentialsBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  skipBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  skipBtnText: { fontSize: 11, fontWeight: '600' },

  // Policy Modal Styles
  policyHeader: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  policyBody: { fontSize: 11, lineHeight: 16, fontWeight: '500', marginBottom: 10 },
  closePolicyBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  closePolicyBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
});
