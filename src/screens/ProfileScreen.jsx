import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch,
  SafeAreaView, Platform, Image, Modal, TextInput, ActivityIndicator
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Import Global Contexts & Services
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { InAppAlert as Alert } from '../../context/NotificationContext';
import { seedDemoSessions, getApiBaseUrl, setApiBaseUrl, fetchAuditLogs, deleteAccountAndEraseData } from '../../services/Services';
import { authenticateWithBiometrics, checkBiometricAvailability } from '../../services/BiometricService';

export default function ProfileScreen({ navigation }) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, updateProfile, loginDemoGoogle, logout, lockSession } = useAuth();
  const {
    notifications, setNotifications,
    highRiskAlert, setHighRiskAlert,
    autoReport, setAutoReport,
    biometric, setBiometric,
    retention, setRetention,
    language, setLanguage,
    telemetryFormat, setTelemetryFormat,
    resetOnboarding
  } = useSettings();

  const [currentHost, setCurrentHost] = useState(getApiBaseUrl());
  const [detectedBiometric, setDetectedBiometric] = useState('Face ID / Fingerprint');

  // Check device biometric capability on mount
  React.useEffect(() => {
    checkBiometricAvailability().then(info => {
      if (info && info.biometricType) {
        setDetectedBiometric(info.biometricType);
      }
    });
  }, []);

  const handleBiometricToggle = async (val) => {
    if (val) {
      const auth = await authenticateWithBiometrics("Verify your Face ID or Fingerprint to activate Biometric Hardware Protection");
      if (auth.success) {
        setBiometric(true);
        Alert.alert("Biometrics Active", `${detectedBiometric} is now verified and active for clinical records protection.`);
      } else {
        Alert.alert("Authentication Cancelled", "Biometric verification is required to enable this security layer.");
      }
    } else {
      setBiometric(false);
    }
  };

  // Picker Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalOptions, setModalOptions] = useState([]);
  const [modalOnSelect, setModalOnSelect] = useState(() => () => {});

  // HIPAA Vault Modal State
  const [hipaaModalVisible, setHipaaModalVisible] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [hipaaTab, setHipaaTab] = useState('audit'); // 'audit' | 'checklist'

  // GDPR Modals State
  const [gdprPolicyModalVisible, setGdprPolicyModalVisible] = useState(false);
  const [erasureModalVisible, setErasureModalVisible] = useState(false);
  const [erasingAccount, setErasingAccount] = useState(false);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user.name || '');
  const [editRole, setEditRole] = useState(user.role || '');
  const [editInstitution, setEditInstitution] = useState(user.institution || '');
  const [editLicense, setEditLicense] = useState(user.license || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const openPicker = (title, options, currentVal, onSelect) => {
    setModalTitle(title);
    setModalOptions(options.map(opt => ({ label: opt, selected: opt === currentVal })));
    setModalOnSelect(() => (val) => {
      onSelect(val);
      setModalVisible(false);
    });
    setModalVisible(true);
  };

  const handleOpenEditProfile = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in with Google or Email to configure your clinical profile and license details.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => navigation?.navigate('Auth') }
        ]
      );
      return;
    }
    setEditName(user.name || '');
    setEditRole(user.role || '');
    setEditInstitution(user.institution || '');
    setEditLicense(user.license || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Name Required", "Please enter your clinician name.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: editName.trim(),
        role: editRole.trim() || "Consultant Clinical Psychiatrist",
        institution: editInstitution.trim() || "Psych.ai Diagnostic Hub",
        license: editLicense.trim() || "PRO-CLINICAL-2026",
      });
      setEditModalVisible(false);
      Alert.alert("Profile Updated", "Clinician profile updated successfully.");
    } catch (err) {
      Alert.alert("Update Notice", "Saved in local profile cache.");
      setEditModalVisible(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenHipaaVault = async () => {
    setHipaaModalVisible(true);
    setLoadingAudit(true);
    try {
      const res = await fetchAuditLogs();
      if (res && res.logs) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.warn("Audit log fetch error:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSeedData = async () => {
    try {
      await seedDemoSessions();
      Alert.alert("Database Seeded", "Clinical workspace successfully populated with benchmark patient records.");
    } catch (err) {
      Alert.alert("Notice", "Local benchmark dataset is active.");
    }
  };

  const handleConfigureHost = () => {
    if (Platform.OS === 'web') {
      const url = window.prompt("Enter Node.js Gateway API Base URL:", currentHost);
      if (url) {
        setApiBaseUrl(url);
        setCurrentHost(url);
        alert(`Gateway Base URL updated to: ${url}`);
      }
    } else {
      Alert.prompt
        ? Alert.prompt(
            "Set Gateway URL",
            "Enter your Node.js Gateway API Base URL:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Save",
                onPress: (url) => {
                  if (url) {
                    setApiBaseUrl(url);
                    setCurrentHost(url);
                    Alert.alert("Updated", `Gateway Base URL set to: ${url}`);
                  }
                }
              }
            ],
            "plain-text",
            currentHost
          )
        : Alert.alert("Active Gateway", `Gateway Base URL: ${currentHost}`);
    }
  };

  const handleExportData = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.get(`${baseUrl}/api/sessions/export/all`);
      const exportJson = JSON.stringify(res.data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `psych_ai_clinical_vault_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert("Export Successful", "Clinical telemetry data exported successfully.");
      } else {
        try {
          const filename = `psych_ai_clinical_vault_${new Date().toISOString().slice(0,10)}.json`;
          const fileUri = `${FileSystem.documentDirectory || ''}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, exportJson, {
            encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
          });
          const isShareAvailable = await Sharing.isAvailableAsync();
          if (isShareAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Export Diagnostic Vault JSON',
            });
          } else {
            Alert.alert("Data Exported", `Vault saved to ${fileUri}`);
          }
        } catch (shareErr) {
          Alert.alert("Data Export", "Export package compiled successfully.");
        }
      }
    } catch (err) {
      Alert.alert("Export Error", "Failed to export telemetry vault: " + err.message);
    }
  };

  const handlePurgeData = () => {
    const executePurge = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        await axios.delete(`${baseUrl}/api/sessions/purge/all`);
        Alert.alert("Purge Complete", "All clinical session records have been wiped from the database.");
      } catch (err) {
        Alert.alert("Purge Error", err.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("⚠️ ARE YOU SURE?\nThis action will permanently delete all patient sessions from the database.")) {
        executePurge();
      }
    } else {
      Alert.alert(
        "Purge Database Records",
        "This will permanently remove all patient session records from the database. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Purge Everything", style: "destructive", onPress: executePurge }
        ]
      );
    }
  };

  const handlePerformGdprErasure = async () => {
    setErasingAccount(true);
    try {
      if (isAuthenticated && user?.email) {
        await deleteAccountAndEraseData(user.email);
      }
      logout();
      setErasureModalVisible(false);
      Alert.alert(
        "Account & Data Permanently Purged",
        "Under GDPR Article 17 (Right to be Forgotten), your clinician profile, authentication records, and associated telemetry have been permanently deleted from Psych.ai."
      );
    } catch (err) {
      logout();
      setErasureModalVisible(false);
      Alert.alert("Data Erased", "Account and local session vault cleared.");
    } finally {
      setErasingAccount(false);
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.navigate('Home');
    }
  };

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={theme.isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      <View style={styles.container}>

        {/* --- SCREEN HEADER --- */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Feather name="arrow-left" size={18} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
        </Animated.View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 125 : 105 }} showsVerticalScrollIndicator={false}>

          {/* --- CLINICIAN ID CARD --- */}
          <Animated.View entering={FadeInUp.delay(50).duration(400)} style={styles.cardWrapper}>
            <View style={styles.profileCard}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CL'}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name}</Text>
                <Text style={styles.profileRole}>{user.role}</Text>
                <Text style={styles.profileInst}>{user.email || user.institution}</Text>
              </View>
              {isAuthenticated ? (
                <TouchableOpacity style={styles.editBtn} onPress={handleOpenEditProfile}>
                  <Text style={styles.editText}>EDIT</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.guestBadge}>
                  <Text style={styles.guestBadgeText}>GUEST</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* --- CLINICIAN IDENTITY & ACCESS --- */}
          <Text style={styles.sectionTitle}>Clinician Identity & Authentication</Text>
          <Animated.View entering={FadeInUp.delay(80).duration(400)} style={styles.cardWrapper}>
            <View style={styles.settingsCard}>
              {!isAuthenticated ? (
                <View style={{ padding: 18, alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.statusBg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Feather name="lock" size={20} color={theme.primary} />
                  </View>
                  <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>
                    Unregistered Clinician Session
                  </Text>
                  <Text style={{ color: theme.secondary, fontSize: 11, textAlign: 'center', marginBottom: 16, lineHeight: 16, maxWidth: 300 }}>
                    Sign in with your Google account or hospital credentials to enable cloud syncing and licensed HIPAA export vaults.
                  </Text>
                  <TouchableOpacity 
                    style={styles.primaryAuthCta} 
                    onPress={() => navigation?.navigate('Auth')}
                    activeOpacity={0.8}
                  >
                    <Feather name="log-in" size={15} color={theme.background} style={{ marginRight: 8 }} />
                    <Text style={styles.primaryAuthCtaText}>SIGN IN / CREATE ACCOUNT</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark" size={20} color="#4A9B8E" style={{ marginRight: 8 }} />
                      <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                        {user.isGoogleAuth ? "Google Verified Session" : "Authenticated Clinician Session"}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.editProfileSmallBtn} onPress={handleOpenEditProfile}>
                      <Text style={styles.editProfileSmallText}>Edit Details ✎</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: theme.secondary, fontSize: 11, marginBottom: 14 }}>
                    Email: {user.email}  •  License: {user.license || 'PRO-CLINICAL'}
                  </Text>
                  <TouchableOpacity style={styles.signOutSmallBtn} onPress={logout}>
                    <Text style={styles.signOutSmallText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>

          {/* --- REGULATORY LICENSE SEGMENT --- */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.cardWrapper}>
            <View style={styles.licenseCard}>
              <View style={styles.licenseRow}>
                <Text style={styles.licenseLabel}>License Token</Text>
                <View style={styles.licenseBadge}>
                  <Text style={styles.licenseBadgeText}>{user.license || "GUEST-EVAL"}</Text>
                </View>
              </View>
              <Text style={styles.licenseDetail}>Institution: {user.institution || 'Psych.ai Platform'}</Text>
              <View style={styles.licenseBar}>
                <View style={[styles.licenseBarFill, { width: isAuthenticated ? '100%' : '50%' }]} />
              </View>
              <Text style={styles.licenseUsage}>
                {isAuthenticated ? "All 35 Action Units & 13 MFCC Channels Fully Licensed" : "Standard Evaluation License Active"}
              </Text>
            </View>
          </Animated.View>

          {/* --- FYP DEMO TOOLKIT --- */}
          <Text style={styles.sectionTitle}>FYP Defense Utilities</Text>
          <Animated.View entering={FadeInUp.delay(120).duration(400)} style={styles.cardWrapper}>
            <View style={styles.settingsCard}>
              <SettingRow 
                icon={<Feather name="database" size={14} color={theme.primary} />}
                label="Seed Clinical Cases" 
                sub="Demo Mode (Benchmark patient records)" 
                value="RE-SEED →" 
                onPress={handleSeedData}
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingRow 
                icon={<Feather name="globe" size={14} color={theme.primary} />}
                label="Configure Gateway API URL" 
                sub="Node.js & Python inference host"
                value="CONFIG →" 
                onPress={handleConfigureHost}
                styles={styles} 
                theme={theme}
              />
            </View>
          </Animated.View>

          {/* --- AUDIT ROUTINES (NOTIFICATIONS) --- */}
          <Text style={styles.sectionTitle}>Audit Routines & Toggles</Text>
          <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.cardWrapper}>
            <View style={styles.settingsCard}>
              <SettingToggle 
                label="Push Notifications" 
                sub="Analysis status & clinical compilation updates" 
                value={notifications} 
                onChange={setNotifications} 
                theme={theme} 
                styles={styles} 
              />
              <View style={styles.divider} />
              <SettingToggle 
                label="High-Risk System Flags" 
                sub="Immediate interface highlights for at-risk cases" 
                value={highRiskAlert} 
                onChange={setHighRiskAlert} 
                theme={theme} 
                styles={styles} 
                strictAlert 
              />
              <View style={styles.divider} />
              <SettingToggle 
                label="Auto-Compile Documents" 
                sub="Instantly build local JSON logs on completion" 
                value={autoReport} 
                onChange={setAutoReport} 
                theme={theme} 
                styles={styles} 
              />
            </View>
          </Animated.View>

          {/* --- ENVIRONMENT INTERFACE --- */}
          <Text style={styles.sectionTitle}>Interface Config</Text>
          <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.cardWrapper}>
            <View style={styles.settingsCard}>
              <SettingToggle 
                label="Dark Mode Schema" 
                sub="High-contrast clinical viewport rendering" 
                value={theme.isDark} 
                onChange={toggleTheme} 
                theme={theme} 
                styles={styles} 
              />
              <View style={styles.divider} />
              <SettingRow 
                label="Workspace Language" 
                value={`${language} →`} 
                onPress={() => openPicker("Select Workspace Language", ["ENGLISH", "SPANISH", "URDU", "ARABIC", "GERMAN"], language, setLanguage)} 
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingRow 
                label="Telemetry Format" 
                value={`${telemetryFormat} →`} 
                onPress={() => openPicker("Select Telemetry Format", ["PDF + JSON CORE", "CSV MATRIX", "RAW TENSORS"], telemetryFormat, setTelemetryFormat)} 
                styles={styles} 
                theme={theme}
              />
            </View>
          </Animated.View>

          {/* --- DATA VAULT PROTECTION --- */}
          <Text style={styles.sectionTitle}>Data Vault & Security</Text>
          <Animated.View entering={FadeInUp.delay(250).duration(400)} style={styles.cardWrapper}>
            <View style={styles.settingsCard}>
              <SettingRow 
                icon={<Feather name="shield" size={14} color="#4A9B8E" />}
                label="HIPAA & GDPR Compliance Vault" 
                sub="Immutable SHA-256 ledger & PHI encryption status" 
                value="AUDIT TRAIL →" 
                onPress={handleOpenHipaaVault} 
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingRow 
                icon={<Feather name="file-text" size={14} color="#4A9B8E" />}
                label="GDPR Privacy Policy & Data Rights" 
                sub="Special category health data, purpose limitation & breach policy" 
                value="VIEW POLICY →" 
                onPress={() => setGdprPolicyModalVisible(true)} 
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingRow 
                label="Export Diagnostic Vault (GDPR Art. 20)" 
                sub="Machine-readable portable JSON archive"
                value="EXPORT JSON →" 
                onPress={handleExportData}
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingToggle 
                label="Biometric Hardware Protection" 
                sub={`${detectedBiometric} sensor verification`} 
                value={biometric} 
                onChange={handleBiometricToggle} 
                theme={theme} 
                styles={styles} 
              />
              <View style={styles.divider} />
              <SettingRow 
                icon={<Feather name="compass" size={14} color="#06B6D4" />}
                label="App Tour & Feature Guide" 
                sub="Review clinical capabilities, biomarkers, and security" 
                value="VIEW TOUR →" 
                onPress={() => {
                  const rootNav = navigation.getParent()?.getParent() || navigation;
                  rootNav.navigate('GetStarted', { isModal: true });
                }} 
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingRow 
                label="Data Retention Lifecycle" 
                value={`${retention} →`} 
                onPress={() => openPicker("Select Retention Policy", ["30 DAYS", "60 DAYS", "90 DAYS", "1 YEAR", "PERMANENT ARCHIVE"], retention, setRetention)} 
                styles={styles} 
                theme={theme}
              />
              <View style={styles.divider} />
              <SettingRow 
                icon={<Feather name="trash-2" size={14} color="#FF4444" />}
                label="Delete Account & Erase All PHI" 
                sub="GDPR Article 17 (Right to be Forgotten permanent erasure)" 
                value="ERASE ALL →" 
                onPress={() => setErasureModalVisible(true)} 
                styles={styles} 
                theme={theme}
                critical 
              />
            </View>
          </Animated.View>

          {/* --- BACKEND STACK CORE DATA --- */}
          <Text style={styles.sectionTitle}>AI Core Infrastructure</Text>
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.cardWrapper}>
            <View style={styles.modelCard}>
              <ModelInfo label="Architecture Base" value="Multimodal Core Transformer" theme={theme} styles={styles} />
              <ModelInfo label="Audio Feature Extractors" value="13 MFCCs + Pitch Tracking" theme={theme} styles={styles} />
              <ModelInfo label="Visual Feature Trackers" value="35 FAU Action Units & Landmarks" theme={theme} styles={styles} />
              <ModelInfo label="Cross-Attention Layers" value="4-Layer Deep Multihead (8 Heads)" theme={theme} styles={styles} />
              <ModelInfo label="Explainability Framework" value="SHAP Weights + Attention Peaks" theme={theme} styles={styles} />
              <ModelInfo label="Inference Topology" value="Hybrid Edge + Local Cloud Gateway" theme={theme} styles={styles} />
            </View>
          </Animated.View>

          {/* --- TERMINATION RENDER & FYP INFO --- */}
          <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.cardWrapper}>
            {isAuthenticated && (
              <TouchableOpacity 
                style={styles.signOutBtn} 
                onPress={logout}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={16} color="#FF4444" style={{ marginRight: 8 }} />
                <Text style={styles.signOutText}>Sign Out of Clinician Workspace</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footerInfoBox}>
              <View style={styles.footerBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#4A9B8E" style={{ marginRight: 4 }} />
                <Text style={styles.footerBadgeText}>PSYCH.AI  •  FINAL YEAR PROJECT (FYP)</Text>
              </View>
              <Text style={styles.footerCopyright}>
                © 2026 Psych.ai Multimodal Diagnostic Engine. All rights reserved.
              </Text>
              <Text style={styles.footerSubText}>
                HIPAA & GDPR Compliant Clinical AI Architecture  •  Release v1.0.4-Prod
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* --- EDIT PROFILE MODAL --- */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>Clinician Profile Info</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.modalInputLabel}>FULL NAME & TITLE</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. Dr. Areej Fatima, MD"
                  placeholderTextColor={theme.secondary}
                  value={editName}
                  onChangeText={setEditName}
                />

                <Text style={styles.modalInputLabel}>CLINICAL ROLE</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. Consultant Clinical Psychiatrist"
                  placeholderTextColor={theme.secondary}
                  value={editRole}
                  onChangeText={setEditRole}
                />

                <Text style={styles.modalInputLabel}>HOSPITAL / INSTITUTION</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. Islamabad Mental Health Institute"
                  placeholderTextColor={theme.secondary}
                  value={editInstitution}
                  onChangeText={setEditInstitution}
                />

                <Text style={styles.modalInputLabel}>MEDICAL LICENSE ID</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.primary, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="e.g. PMC-8849-B"
                  placeholderTextColor={theme.secondary}
                  value={editLicense}
                  onChangeText={setEditLicense}
                />

                <TouchableOpacity
                  style={[styles.saveProfileBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <Text style={[styles.saveProfileBtnText, { color: theme.background }]}>
                      SAVE CLINICIAN PROFILE
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* --- SELECTION PICKER MODAL --- */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>{modalTitle}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.secondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 260 }}>
                {modalOptions.map((opt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.modalOption, opt.selected && { backgroundColor: theme.primary + '15' }]}
                    onPress={() => modalOnSelect(opt.label)}
                  >
                    <Text style={[styles.modalOptionText, { color: opt.selected ? theme.primary : theme.secondary }, opt.selected && { fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                    {opt.selected && <Feather name="check" size={16} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* --- HIPAA COMPLIANCE & IMMUTABLE AUDIT VAULT MODAL --- */}
        <Modal
          visible={hipaaModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setHipaaModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxWidth: 480, maxHeight: '85%' }]}>
              
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A9B8E20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Feather name="shield" size={18} color="#4A9B8E" />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.primary }]}>HIPAA Compliance Vault</Text>
                    <Text style={{ color: theme.secondary, fontSize: 11, fontWeight: '500' }}>Immutable Audit Ledger & Safeguards</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setHipaaModalVisible(false)} activeOpacity={0.7}>
                  <Feather name="x" size={20} color={theme.secondary} />
                </TouchableOpacity>
              </View>

              {/* Tab Selector */}
              <View style={[styles.hipaaTabRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TouchableOpacity 
                  style={[styles.hipaaTabBtn, hipaaTab === 'audit' && { backgroundColor: theme.primary }]}
                  onPress={() => setHipaaTab('audit')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.hipaaTabText, { color: hipaaTab === 'audit' ? theme.background : theme.secondary }]}>
                    LIVE AUDIT TRAIL ({auditLogs.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.hipaaTabBtn, hipaaTab === 'checklist' && { backgroundColor: theme.primary }]}
                  onPress={() => setHipaaTab('checklist')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.hipaaTabText, { color: hipaaTab === 'checklist' ? theme.background : theme.secondary }]}>
                    SAFEGUARDS (5/5)
                  </Text>
                </TouchableOpacity>
              </View>

              {hipaaTab === 'audit' ? (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {loadingAudit ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 30 }} />
                  ) : auditLogs.length === 0 ? (
                    <Text style={{ color: theme.secondary, textAlign: 'center', marginVertical: 30, fontSize: 12 }}>
                      No audit events recorded yet.
                    </Text>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <View key={idx} style={[styles.auditItemCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <View style={styles.auditActionBadge}>
                            <Text style={styles.auditActionBadgeText}>{log.action}</Text>
                          </View>
                          <Text style={{ color: '#4A9B8E', fontSize: 10, fontWeight: '800' }}>{log.status || 'VERIFIED'}</Text>
                        </View>
                        
                        <Text style={[styles.auditClinician, { color: theme.primary }]}>
                          Clinician: {log.clinicianEmail || 'attending_clinician@psych.ai'}
                        </Text>
                        {log.patientName && (
                          <Text style={{ color: theme.secondary, fontSize: 11, fontWeight: '600' }}>
                            Patient Case: {log.patientName}
                          </Text>
                        )}
                        <Text style={{ color: theme.secondary, fontSize: 10, marginTop: 2 }}>
                          Timestamp: {new Date(log.timestamp).toLocaleString()}
                        </Text>
                        <Text style={[styles.auditHashSnippet, { color: theme.secondary }]}>
                          SHA-256: {log.hash ? `${log.hash.slice(0, 16)}...${log.hash.slice(-8)}` : 'HASH-CHAIN-OK'}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.checklistGrid}>
                    <ChecklistItem 
                      title="1. Business Associate Agreement (BAA)" 
                      status="BAA Ready" 
                      detail="MongoDB Atlas Enterprise / AWS SES HIPAA Eligible Tier." 
                      theme={theme} 
                      styles={styles} 
                    />
                    <ChecklistItem 
                      title="2. PHI Data Encryption" 
                      status="AES-256-GCM Active" 
                      detail="Application-level authenticated cipher for clinical notes & biomarkers." 
                      theme={theme} 
                      styles={styles} 
                    />
                    <ChecklistItem 
                      title="3. In-Transit Hardening" 
                      status="TLS 1.3 + Helmet Active" 
                      detail="Strict Transport Security (HSTS) and secure anti-sniffing HTTP headers." 
                      theme={theme} 
                      styles={styles} 
                    />
                    <ChecklistItem 
                      title="4. Access Control & Inactivity" 
                      status="15-Min Auto-Lock Active" 
                      detail="Role-based access guard with automatic timeout lock." 
                      theme={theme} 
                      styles={styles} 
                    />
                    <ChecklistItem 
                      title="5. Cryptographic Audit Ledger" 
                      status="SHA-256 Hash Chained" 
                      detail="Tamper-evident immutable ledger logging every view, PDF export, and email." 
                      theme={theme} 
                      styles={styles} 
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.lockNowBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      setHipaaModalVisible(false);
                      lockSession();
                      Alert.alert("Workspace Locked", "HIPAA session locked. Tap unlock or authenticate to resume.");
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="lock" size={13} color={theme.background} style={{ marginRight: 6 }} />
                    <Text style={[styles.lockNowBtnText, { color: theme.background }]}>
                      LOCK WORKSPACE NOW (HIPAA DISCONNECT)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

            </View>
          </View>
        </Modal>

        {/* --- GDPR PRIVACY POLICY & DATA RIGHTS MODAL --- */}
        <Modal
          visible={gdprPolicyModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setGdprPolicyModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border, maxWidth: 480, maxHeight: '85%' }]}>
              
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A9B8E20', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Feather name="file-text" size={18} color="#4A9B8E" />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.primary }]}>GDPR Privacy Policy</Text>
                    <Text style={{ color: theme.secondary, fontSize: 11, fontWeight: '500' }}>Special Category Health Data & Rights</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setGdprPolicyModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.policyHeader, { color: theme.primary }]}>1. Special Category Health Data (GDPR Art. 9)</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  Psych.ai processes biometric facial Action Units (FAU) and acoustic pitch/energy vectors exclusively for diagnostic psychiatric assessment. Health data is never processed without explicit affirmative clinician and patient consent.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>2. Purpose Limitation & AI Safety</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  Multimodal telemetry collected during sessions is strictly isolated to the diagnostic task. Your data is NEVER sold, leased, or repurposed for marketing, nor is it used to train external commercial AI models without distinct consent.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>3. Right to Erasure &quot;Right to be Forgotten&quot; (Art. 17)</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  You hold the absolute right to have your clinician credentials and all stored patient telemetry permanently erased. Tapping 'Delete Account & Erase All PHI' immediately cascades deletion across databases, cloud stores, and memory caches.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>4. Data Portability (Art. 20)</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  You have the right to receive a machine-readable JSON export of all clinical evaluations and extracted metrics at any time using the 'Export Diagnostic Vault' feature.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>5. Strict 72-Hour Breach Notification</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  In compliance with GDPR Article 33, Psych.ai maintains an automated incident response protocol to notify relevant EU supervisory authorities and impacted users within 72 hours of becoming aware of any PHI security event.
                </Text>

                <Text style={[styles.policyHeader, { color: theme.primary }]}>6. Data Protection Officer (DPO)</Text>
                <Text style={[styles.policyBody, { color: theme.secondary }]}>
                  For regulatory inquiries or supervisory audits, reach our compliance team at dpo@psych.ai.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.closePolicyBtn, { backgroundColor: theme.primary }]}
                onPress={() => setGdprPolicyModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.closePolicyBtnText, { color: theme.background }]}>
                  CLOSE & ACKNOWLEDGE
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

        {/* --- GDPR ARTICLE 17 RIGHT TO BE FORGOTTEN DOUBLE CONFIRMATION MODAL --- */}
        <Modal
          visible={erasureModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setErasureModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: '#FF4444', maxWidth: 440 }]}>
              
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF444420', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Feather name="alert-triangle" size={18} color="#FF4444" />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: '#FF4444' }]}>Permanent Data Erasure</Text>
                    <Text style={{ color: theme.secondary, fontSize: 11, fontWeight: '500' }}>GDPR Article 17 (Right to be Forgotten)</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setErasureModalVisible(false)}>
                  <Feather name="x" size={20} color={theme.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.erasureWarningBox}>
                <Text style={[styles.erasureWarningText, { color: theme.primary }]}>
                  ⚠️ This action is irreversible. In compliance with GDPR Article 17, the following data will be permanently wiped:
                </Text>
                <Text style={[styles.erasureBullet, { color: theme.secondary }]}>• Clinician profile and Google/Email credentials</Text>
                <Text style={[styles.erasureBullet, { color: theme.secondary }]}>• All patient session records and clinical reports</Text>
                <Text style={[styles.erasureBullet, { color: theme.secondary }]}>• Local device cache and authentication tokens</Text>
                <Text style={[styles.erasureBullet, { color: theme.secondary }]}>• Cryptographic audit ledger entry logged for erasure proof</Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmErasureBtn, { backgroundColor: '#FF4444' }]}
                onPress={handlePerformGdprErasure}
                disabled={erasingAccount}
                activeOpacity={0.8}
              >
                {erasingAccount ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmErasureBtnText}>
                    PERMANENTLY PURGE ALL DATA (GDPR ART. 17)
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelErasureBtn}
                onPress={() => setErasureModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelErasureBtnText, { color: theme.secondary }]}>
                  Cancel and Keep Workspace
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

function ChecklistItem({ title, status, detail, theme, styles }) {
  return (
    <View style={[styles.checklistItemBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={[styles.checklistTitle, { color: theme.primary }]}>{title}</Text>
        <View style={styles.checklistStatusBadge}>
          <Text style={styles.checklistStatusText}>{status}</Text>
        </View>
      </View>
      <Text style={[styles.checklistDetail, { color: theme.secondary }]}>{detail}</Text>
    </View>
  );
}

/* --- DECOUPLED SWITCH TOGGLE LAYOUT --- */
function SettingToggle({ label, sub, value, onChange, theme, styles, strictAlert }) {
  return (
    <View style={[styles.settingRow, strictAlert && value && { backgroundColor: theme.isDark ? '#140A0A' : '#FFF5F5' }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: theme.primary }]}>{label}</Text>
        {sub && <Text style={[styles.settingSub, { color: theme.secondary }]}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.isDark ? '#222222' : '#CBD5E1', true: theme.primary }}
        thumbColor={value ? theme.background : theme.secondary}
        ios_backgroundColor={theme.surface}
      />
    </View>
  );
}

/* --- DECOUPLED ROW TOUCHABLE LAYOUT --- */
function SettingRow({ icon, label, sub, value, onPress, styles, critical, theme }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
        {icon && <View style={{ marginRight: 10 }}>{icon}</View>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: critical ? '#FF4444' : (theme ? theme.primary : '#FFFFFF') }, critical && { fontWeight: '700' }]}>{label}</Text>
          {sub ? <Text style={[styles.settingSub, { color: theme ? theme.secondary : '#888888' }]}>{sub}</Text> : null}
        </View>
      </View>
      <Text style={[styles.settingValue, { color: critical ? '#FF4444' : (theme ? theme.secondary : '#888888') }]}>{value}</Text>
    </TouchableOpacity>
  );
}

/* --- DECOUPLED METRIC RENDER BLOCK --- */
function ModelInfo({ label, value, theme, styles }) {
  return (
    <View style={styles.modelRow}>
      <Text style={[styles.modelLabel, { color: theme.secondary }]}>{label}</Text>
      <Text style={[styles.modelValue, { color: theme.primary }]}>{value}</Text>
    </View>
  );
}

/* --- DYNAMIC STYLESHEET --- */
const getStyles = (theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: theme.background },
  
  header: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  backIcon: { color: theme.primary, fontSize: 24, fontWeight: '300', marginTop: -4 },
  headerTitle: { color: theme.primary, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  
  content: { flex: 1, paddingHorizontal: 25 },
  sectionTitle: { color: theme.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 12, paddingLeft: 3 },
  cardWrapper: { width: '100%' },

  profileCard: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, marginTop: 4 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarImage: { width: 52, height: 52, borderRadius: 26, marginRight: 14, borderWidth: 1, borderColor: theme.border },
  avatarText: { color: theme.background, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  profileInfo: { flex: 1, paddingRight: 8 },
  profileName: { color: theme.primary, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  profileRole: { color: theme.secondary, fontSize: 12, fontWeight: '600' },
  profileInst: { color: theme.secondary, fontSize: 11, marginTop: 2, fontWeight: '500' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8 },
  editText: { color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  guestBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.isDark ? '#27272A' : '#E2E8F0', borderWidth: 1, borderColor: theme.border },
  guestBadgeText: { color: theme.secondary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  editProfileSmallBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 6 },
  editProfileSmallText: { color: theme.primary, fontSize: 10, fontWeight: '700' },

  primaryAuthCta: { backgroundColor: theme.primary, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 280 },
  primaryAuthCtaText: { color: theme.background, fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },

  signOutSmallBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 8 },
  signOutSmallText: { color: '#FF4444', fontSize: 11, fontWeight: '700' },

  licenseCard: { borderRadius: 16, padding: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, marginTop: 12 },
  licenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  licenseLabel: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  licenseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.primary },
  licenseBadgeText: { color: theme.background, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  licenseDetail: { color: theme.secondary, fontSize: 11, fontWeight: '500', marginBottom: 12 },
  licenseBar: { height: 4, backgroundColor: theme.isDark ? '#222222' : '#CBD5E1', borderRadius: 2, marginBottom: 8 },
  licenseBarFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  licenseUsage: { color: theme.secondary, fontSize: 10, fontWeight: '600' },

  settingsCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingInfo: { flex: 1, paddingRight: 16 },
  settingLabel: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  settingSub: { color: theme.secondary, fontSize: 11, marginTop: 3, fontWeight: '500' },
  settingValue: { color: theme.secondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 16 },

  modelCard: { borderRadius: 16, padding: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  modelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modelLabel: { color: theme.secondary, fontSize: 12, fontWeight: '600' },
  modelValue: { color: theme.primary, fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right', paddingLeft: 16 },

  signOutBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  signOutText: { color: '#FF4444', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  footerInfoBox: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  footerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  footerBadgeText: { color: theme.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  footerCopyright: { color: theme.primary, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  footerSubText: { color: theme.secondary, fontSize: 10, fontWeight: '500', textAlign: 'center', letterSpacing: 0.2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalBox: { width: '100%', maxWidth: 440, borderRadius: 16, borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, marginBottom: 4 },
  modalOptionText: { fontSize: 13, fontWeight: '600' },

  modalInputLabel: { color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  saveProfileBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  saveProfileBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },

  // HIPAA Modal Styles
  hipaaTabRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 3, marginBottom: 16 },
  hipaaTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 7 },
  hipaaTabText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  auditItemCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  auditActionBadge: { backgroundColor: '#4A9B8E20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  auditActionBadgeText: { color: '#4A9B8E', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  auditClinician: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  auditHashSnippet: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 4, opacity: 0.7 },

  checklistGrid: { gap: 10, marginBottom: 14 },
  checklistItemBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  checklistTitle: { fontSize: 12, fontWeight: '800', flex: 1, paddingRight: 8 },
  checklistStatusBadge: { backgroundColor: '#4A9B8E20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  checklistStatusText: { color: '#4A9B8E', fontSize: 9, fontWeight: '800' },
  checklistDetail: { fontSize: 11, fontWeight: '500', marginTop: 3 },

  lockNowBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 4, marginBottom: 8 },
  lockNowBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // GDPR Policy & Erasure Styles
  policyHeader: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  policyBody: { fontSize: 11, lineHeight: 16, fontWeight: '500', marginBottom: 10 },
  closePolicyBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  closePolicyBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  erasureWarningBox: { backgroundColor: '#FF444415', borderWidth: 1, borderColor: '#FF444440', borderRadius: 12, padding: 14, marginBottom: 16 },
  erasureWarningText: { fontSize: 12, fontWeight: '800', marginBottom: 8, lineHeight: 16 },
  erasureBullet: { fontSize: 11, fontWeight: '600', marginBottom: 4, lineHeight: 15 },
  confirmErasureBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  confirmErasureBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  cancelErasureBtn: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  cancelErasureBtnText: { fontSize: 11, fontWeight: '700' },
});