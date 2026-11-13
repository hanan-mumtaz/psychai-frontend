import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, TextInput, ScrollView, ActivityIndicator, SafeAreaView, Platform, Image
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';

// Import Services & Theme Context
import { fetchHistoricalSessions } from '../../services/Services';
import { useTheme } from '../../context/ThemeContext'; 
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { authenticateWithBiometrics } from '../../services/BiometricService';
import { InAppAlert as Alert } from '../../context/NotificationContext';

export default function ClinicalDashboard({ navigation }) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  
  const { biometric, biometricTipDismissed, enableBiometricsWithPrompt, setBiometricTipDismissed } = useSettings();
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [tipDismissedThisSession, setTipDismissedThisSession] = useState(false);

  const showSecurityTip = !biometric && !biometricTipDismissed && !tipDismissedThisSession;

  const handleOpenSession = async (session) => {
    if (biometric) {
      const auth = await authenticateWithBiometrics(
        `Verify biometrics to view ${session.name || 'patient'}'s telemetry report`,
        "Enter Device Passcode"
      );
      if (auth.success) {
        navigation?.navigate('SessionDetail', { session });
      } else {
        Alert.alert("Biometric Required", "Biometric verification is required to access confidential patient records.");
      }
    } else {
      navigation?.navigate('SessionDetail', { session });
    }
  };

  const handleEnableBiometricsFromTip = async () => {
    const res = await enableBiometricsWithPrompt();
    if (res.success) {
      Alert.alert("Biometrics Enabled", `${res.biometricType || 'Face ID / Fingerprint'} is now active for clinical records protection.`);
    }
  };

  const handleDismissTipPermanently = async () => {
    await setBiometricTipDismissed(true);
  };

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const data = await fetchHistoricalSessions();
      setSessions(data);
    } catch (err) {
      console.error("UI Interface Sync Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWorkspaceData();
  };

  useEffect(() => {
    loadWorkspaceData();
    const refreshTrigger = navigation.addListener('focus', loadWorkspaceData);
    return refreshTrigger;
  }, [navigation]);

  const filteredSessions = sessions.filter(session => {
    const queryMatch = session.name?.toLowerCase().includes(search.toLowerCase());
    const filterMatch = activeFilter === 'all' || session.risk === activeFilter;
    return queryMatch && filterMatch;
  });

  const aggregateStats = {
    total: sessions.length,
    high: sessions.filter(s => s.risk === 'high').length,
    pending: sessions.filter(s => s.status === 'pending').length,
  };

  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={theme.isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      <View style={styles.container}>

        {/* --- WORKSPACE HEADER --- */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          
          <View style={styles.headerTop}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Dynamic Icon Toggle */}
                <Image 
                  source={
                    theme.isDark 
                      ? require('../../assets/navbar.png') 
                      : require('../../assets/navbarli.png')
                  } 
                  style={{ width: 33, height: 32, marginBottom: -6 }} 
                />
                
                {/* Dynamic Wordmark Toggle */}
                <Image 
                  source={
                    theme.isDark 
                      ? require('../../assets/nav.png') 
                      : require('../../assets/navl.png')
                  } 
                  style={{ width: 50, height: 15, marginBottom: -15, marginLeft: 2 }} 
                />
              </View>
              <Text style={styles.subBrandText}>Clinical Workspace</Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleTheme} activeOpacity={0.7}>
                <Feather name={theme.isDark ? "sun" : "moon"} size={17} color={theme.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileIndicator} 
                onPress={() => navigation?.navigate('Profile')}
                activeOpacity={0.8}
              >
                {user?.picture ? (
                  <Image source={{ uri: user.picture }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                ) : (
                  <Text style={styles.profileText}>
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CL'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* --- FIXED STATS RIBBON --- */}
          <View style={styles.statsGrid}>
            <MetricCard title="Total Audits" value={aggregateStats.total} context="Files" styles={styles} theme={theme} />
            <MetricCard title="High Risk" value={aggregateStats.high} context="Alerts" inverted styles={styles} theme={theme} />
            <MetricCard title="Processing" value={aggregateStats.pending} context="Queue" styles={styles} theme={theme} />
          </View>
        </Animated.View>

        {/* --- CLINICIAN BIOMETRIC SECURITY TIP BANNER --- */}
        {showSecurityTip && (
          <Animated.View entering={FadeInUp.duration(400)} style={styles.securityTipCard}>
            <View style={styles.securityTipHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.shieldTipIcon}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
                </View>
                <Text style={styles.securityTipTitle}>SECURITY RECOMMENDATION</Text>
              </View>
              <TouchableOpacity onPress={() => setTipDismissedThisSession(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={14} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.securityTipBody}>
              Safeguard patient telemetry and diagnostic reports. Enable biometric authentication (Face ID / Fingerprint) for app startup and report access.
            </Text>

            <View style={styles.securityTipActions}>
              <TouchableOpacity 
                style={styles.enableTipBtn} 
                onPress={handleEnableBiometricsFromTip}
                activeOpacity={0.8}
              >
                <Ionicons name="finger-print" size={13} color={theme.background} style={{ marginRight: 5 }} />
                <Text style={styles.enableTipBtnText}>TURN ON BIOMETRICS</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dismissTipBtn} 
                onPress={handleDismissTipPermanently}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissTipBtnText}>Don't show again</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* --- CONTROL PANEL --- */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color={theme.secondary} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchField}
              placeholder="Search patient logs..."
              placeholderTextColor={theme.secondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.chipScrollContent}
          >
            {['all', 'high', 'moderate', 'low'].map(tier => (
              <TouchableOpacity
                key={tier}
                style={[styles.chip, activeFilter === tier && styles.chipActive]}
                onPress={() => setActiveFilter(tier)}
              >
                <Text style={[styles.chipText, activeFilter === tier && styles.chipTextActive]}>
                  {tier.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- FUNCTIONAL LIST RENDERING --- */}
        {loading ? (
          <View style={styles.centerFocus}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredSessions}
            keyExtractor={item => item._id || item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
                <TouchableOpacity
                  onPress={() => handleOpenSession(item)}
                  activeOpacity={0.7}
                  style={styles.logCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.patientInfoGroup}>
                      <View style={styles.avatarMini}>
                        <Text style={styles.avatarMiniText}>
                          {item.name ? item.name.substring(0, 2).toUpperCase() : "PT"}
                        </Text>
                      </View>
                      <Text style={styles.patientName} numberOfLines={1}>{item.name || "Anonymous"}</Text>
                    </View>
                    
                    <View style={[styles.indicatorBadge, item.risk === 'high' && styles.indicatorBadgeHigh]}>
                      <Text style={[styles.badgeText, item.risk === 'high' && styles.badgeTextHigh]}>
                        {item.risk?.toUpperCase() || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.metaLine}>
                    {item.date}  |  {item.duration}  |  Mood: {item.mood}
                  </Text>

                  <View style={styles.footerRow}>
                    <View style={styles.tagGroup}>
                      {item.tags?.slice(0, 2).map(tag => (
                        <View key={tag} style={styles.structuralTag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.statusIndicator}>{item.status?.toUpperCase()}</Text>
                      <Feather name="chevron-right" size={14} color={theme.secondary} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
            ListEmptyComponent={
              <View style={styles.centerFocus}>
                <Text style={styles.emptyText}>No matching clinical records found.</Text>
              </View>
            }
          />
        )}

        {/* --- FAB --- */}
        <TouchableOpacity style={styles.floatingActionBtn} onPress={() => navigation?.navigate('NewSession')} activeOpacity={0.8}>
          <Feather name="plus" size={26} color={theme.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* --- METRIC CARD --- */
function MetricCard({ title, value, context, inverted, styles, theme }) {
  return (
    <View style={[styles.metricBox, inverted && styles.metricBoxInverted]}>
      <Text style={[styles.metricValue, inverted && { color: theme.background }]} numberOfLines={1}>{value}</Text>
      <View>
        <Text style={[styles.metricTitle, inverted && { color: theme.background }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.metricContext, inverted && { color: theme.background }]}>{context}</Text>
      </View>
    </View>
  );
}

/* --- DYNAMIC STYLESHEET GENERATOR --- */
const getStyles = (theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: theme.background },
  
  // --- HEADER WINDOW ---
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }, 
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  brandText: { color: theme.primary, fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  subBrandText: { color: theme.secondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  
  profileIndicator: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  profileText: { color: theme.background, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  
  // --- FIXED STATS GRID ---
  statsGrid: { 
    width: '100%',
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    gap: 3, // Modern gap property for consistent spacing without needing to calculate margins
  },
  
  metricBox: { 
    flex: 1, 
    height: 104, 
    padding: 12, 
    marginHorizontal: 4, // Clean margins that balance out space-between layout parameters
    backgroundColor: theme.surface, 
    borderWidth: 1, 
    borderColor: theme.border, 
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  metricBoxInverted: { backgroundColor: theme.primary, borderColor: theme.primary },
  metricValue: { fontSize: 26, fontWeight: '800', color: theme.primary }, 
  metricTitle: { fontSize: 10, fontWeight: '700', color: theme.secondary, textTransform: 'uppercase', letterSpacing: 0.1 },
  metricContext: { fontSize: 9, color: theme.secondary, marginTop: 1 },

  // --- CLINICIAN SECURITY TIP BANNER ---
  securityTipCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  securityTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shieldTipIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.statusBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  securityTipTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: theme.primary,
  },
  securityTipBody: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.secondary,
    fontWeight: '500',
    marginBottom: 12,
  },
  securityTipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  enableTipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  enableTipBtnText: {
    color: theme.background,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dismissTipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  dismissTipBtnText: {
    color: theme.secondary,
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // --- CONTROL PANEL ---
  filterSection: { paddingBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, mx: 24, marginHorizontal: 24 },
  searchSymbol: { fontSize: 16, marginRight: 10 },
  searchField: { flex: 1, color: theme.primary, fontSize: 14, fontWeight: '500' },
  
  chipScrollContent: { paddingHorizontal: 24 }, // Padding handled directly within chip track context
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, marginRight: 10 },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.secondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: theme.background },

  // --- LIST SCROLL WINDOW ---
  listContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 125 : 105 }, 
  centerFocus: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: theme.secondary, fontSize: 14, fontWeight: '500' },
  
  logCard: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 18, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  patientInfoGroup: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }, 
  avatarMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.statusBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarMiniText: { color: theme.primary, fontSize: 11, fontWeight: '700' },
  patientName: { color: theme.primary, fontSize: 16, fontWeight: '700', flexShrink: 1 }, 
  
  indicatorBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, backgroundColor: theme.background, borderColor: theme.border },
  indicatorBadgeHigh: { backgroundColor: theme.primary, borderColor: theme.primary },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: theme.secondary },
  badgeTextHigh: { color: theme.background },
  
  metaLine: { color: theme.secondary, fontSize: 12, fontWeight: '500', marginBottom: 16 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagGroup: { flexDirection: 'row', gap: 8 },
  structuralTag: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.statusBg, borderRadius: 6 },
  tagText: { color: theme.secondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  statusIndicator: { color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // --- FLOATING ACTION BUTTON ---
  floatingActionBtn: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 102 : 92, 
    right: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: theme.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: theme.isDark ? 0.4 : 0.15, 
    shadowRadius: 8, 
    elevation: 6 
  },
});