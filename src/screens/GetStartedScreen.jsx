import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  ScrollView,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { InAppAlert } from '../../context/NotificationContext';

const SLIDES = [
  {
    id: '1',
    badge: 'CLINICAL INTELLIGENCE',
    title: 'Objective Mental Health Telemetry',
    subtitle: 'Replacing subjective recall questionnaires with reproducible physiological and vocal biomarker telemetry.',
    icon: 'pulse',
    iconColor: '#38BDF8',
    iconBg: 'rgba(56, 189, 248, 0.12)',
    iconBorder: 'rgba(56, 189, 248, 0.28)',
    features: [
      { icon: 'checkmark-circle-outline', title: '86.24% Diagnostic Accuracy', desc: 'Clinically validated on the DAIC-WOZ benchmark split.' },
      { icon: 'git-network-outline', title: 'Cross-Attention Transformer', desc: '4-layer deep neural fusion of vocal and facial streams.' },
      { icon: 'speedometer-outline', title: 'Continuous Severity Index', desc: 'Quantitative scoring aligned with DSM-5 & PHQ-9 scales.' }
    ]
  },
  {
    id: '2',
    badge: 'DEEP SIGNAL PROCESSING',
    title: 'Vocal Prosody & Facial Action Units',
    subtitle: 'Synchronous extraction of sub-second vocal acoustics and micro-expressions in real-time clinical dialogue.',
    icon: 'videocam',
    iconColor: '#A855F7',
    iconBg: 'rgba(168, 85, 247, 0.12)',
    iconBorder: 'rgba(168, 85, 247, 0.28)',
    features: [
      { icon: 'mic-outline', title: '13 MFCC Vocal Channels', desc: 'Tracks pitch variability (F0), pause ratios, and flat affect.' },
      { icon: 'scan-outline', title: '35 FACS Facial Action Units', desc: 'Sub-second tracking of Brow Lowerer, Lip Corner Depressor, etc.' },
      { icon: 'eye-outline', title: 'Affective Telemetry', desc: 'Measures eye gaze avoidance and psychomotor delay patterns.' }
    ]
  },
  {
    id: '3',
    badge: 'EXPLAINABLE AI (XAI)',
    title: 'Transparent Clinical Decisions',
    subtitle: 'Unraveling the deep learning black-box with KernelSHAP biomarker attribution to empower psychiatrist confidence.',
    icon: 'pie-chart',
    iconColor: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    iconBorder: 'rgba(16, 185, 129, 0.28)',
    features: [
      { icon: 'analytics-outline', title: 'SHAP Attribution Matrix', desc: 'Isolates the exact acoustic and facial features driving risk.' },
      { icon: 'time-outline', title: 'Distress Peak Anchors', desc: 'Pinpoints specific timestamps of high affective disturbance.' },
      { icon: 'document-text-outline', title: 'Signed Vector PDF Reports', desc: '1-click export of clinical documentation with verified seal.' }
    ]
  },
  {
    id: '4',
    badge: 'ZERO-TRUST SECURITY',
    title: 'HIPAA & GDPR Grade Privacy',
    subtitle: 'Patient telemetry is safeguarded with on-device hardware biometrics and Galois/Counter Mode cryptography.',
    icon: 'shield-checkmark',
    iconColor: '#06B6D4',
    iconBg: 'rgba(6, 182, 212, 0.12)',
    iconBorder: 'rgba(6, 182, 212, 0.28)',
    features: [
      { icon: 'lock-closed-outline', title: 'AES-256-GCM Encryption', desc: 'Field-level protection for all Protected Health Information (PHI).' },
      { icon: 'finger-print-outline', title: 'Hardware Biometric Gate', desc: 'Protected by Apple Secure Enclave & Android KeyStore.' },
      { icon: 'ribbon-outline', title: 'Immutable Audit Ledger', desc: 'HMAC-SHA256 chained audit logs for regulatory oversight.' }
    ]
  }
];

export default function GetStartedScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { loginAsGuest } = useAuth();
  const { completeOnboarding } = useSettings();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const isModal = route?.params?.isModal || false;
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && windowWidth > 768;
  const isTablet = windowWidth > 540 && windowWidth <= 768;

  // Exact safe insets preventing status bar / battery / notch collisions on Android & iOS
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : (isWeb ? 16 : 0)
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 20 : 14
  );

  // Responsive slide width
  const maxCardWidth = isDesktop ? 520 : (isTablet ? 480 : windowWidth);
  const slideWidth = maxCardWidth;

  // Jump to specific slide safely across all platforms
  const goToSlide = (index) => {
    if (index < 0 || index >= SLIDES.length) return;
    setCurrentIndex(index);
    if (flatListRef.current) {
      try {
        flatListRef.current.scrollToOffset({
          offset: index * slideWidth,
          animated: true,
        });
      } catch (err) {
        console.warn('Slide scroll error:', err);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleSignIn();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  };

  const handleSignIn = async () => {
    await completeOnboarding();
    if (isModal && navigation?.canGoBack()) {
      navigation.goBack();
      setTimeout(() => navigation?.navigate('Auth'), 60);
    } else {
      navigation?.navigate('Auth');
    }
  };

  const handleUseWithoutSignIn = async () => {
    loginAsGuest();
    await completeOnboarding();
    InAppAlert.toast(
      'Demo Workspace Active',
      'Exploring Psych.ai in Guest Mode with sample clinical records.',
      'success'
    );
    if (isModal && navigation?.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.replace) {
      navigation.replace('MainTabs');
    } else {
      navigation?.navigate('MainTabs');
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    if (isModal && navigation?.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.replace) {
      navigation.replace('MainTabs');
    } else {
      navigation?.navigate('MainTabs');
    }
  };

  // Keyboard navigation for desktop web browsers (ArrowRight, ArrowLeft, Enter)
  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      const handleKeyDown = (e) => {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          if (currentIndex < SLIDES.length - 1) {
            goToSlide(currentIndex + 1);
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          if (currentIndex > 0) {
            goToSlide(currentIndex - 1);
          }
        } else if (e.key === 'Enter' && currentIndex === SLIDES.length - 1) {
          e.preventDefault();
          handleSignIn();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentIndex, slideWidth, isWeb]);

  // Keep scroll position synchronized when window dimensions change
  useEffect(() => {
    if (flatListRef.current) {
      try {
        flatListRef.current.scrollToOffset({
          offset: currentIndex * slideWidth,
          animated: false,
        });
      } catch (e) {
        // ignore layout race
      }
    }
  }, [slideWidth]);

  const onMomentumScrollEnd = (e) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideWidth);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const getItemLayout = (_, index) => ({
    length: slideWidth,
    offset: slideWidth * index,
    index,
  });

  const currentSlide = SLIDES[currentIndex] || SLIDES[0];
  const styles = getStyles(theme, isDesktop, isTablet, slideWidth, windowHeight);

  return (
    <View style={[styles.outerContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={Platform.OS === 'android'}
      />

      {/* Main Responsive Card Container */}
      <View style={[styles.mainCard, { borderColor: isDesktop ? theme.border : 'transparent' }]}>
        
        {/* --- TOP HEADER BAR --- */}
        <View style={[
          styles.headerBar,
          {
            paddingTop: isDesktop ? 16 : topInset + (Platform.OS === 'android' ? 8 : 4),
            borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          }
        ]}>
          {/* Brand Row with Clean Baseline Alignment */}
          <View style={styles.brandRow}>
            <Image 
              source={
                theme.isDark 
                  ? require('../../assets/navbar.png') 
                  : require('../../assets/navbarli.png')
              } 
              style={styles.brandIcon}
              resizeMode="contain"
            />
            <Image 
              source={
                theme.isDark 
                  ? require('../../assets/nav.png') 
                  : require('../../assets/navl.png')
              } 
              style={styles.brandWordmark}
              resizeMode="contain"
            />
          </View>

          {/* Step Pill Counter */}
          <View style={[styles.stepPill, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.stepPillText, { color: currentSlide.iconColor }]}>
              {currentIndex + 1} <Text style={{ color: theme.secondary, fontWeight: '500' }}>/ {SLIDES.length}</Text>
            </Text>
          </View>

          {isModal ? (
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => {
                if (navigation?.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate('MainTabs');
                }
              }}
              accessibilityLabel="Close Tour"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.skipBtn} 
              onPress={handleSkip} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.skipText, { color: theme.secondary }]}>Skip Tour</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- SLIDES CAROUSEL CONTAINER --- */}
        <View style={styles.carouselContainer}>
          
          {/* Desktop Left Navigation Chevron */}
          {isDesktop && currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.desktopChevron, styles.desktopChevronLeft, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handlePrev}
              activeOpacity={0.8}
              accessibilityLabel="Previous Slide"
            >
              <Ionicons name="chevron-back" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}

          {/* Carousel FlatList */}
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled={Platform.OS !== 'web'}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={getItemLayout}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            snapToInterval={slideWidth}
            snapToAlignment="center"
            decelerationRate="fast"
            keyExtractor={(item) => item.id}
            style={{ width: slideWidth }}
            renderItem={({ item }) => (
              <View style={[styles.slideOuter, { width: slideWidth }]}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.slideScrollContent}
                  bounces={false}
                >
                  {/* Top Icon Badge */}
                  <Animated.View
                    entering={FadeInDown.duration(350)}
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: item.iconBg,
                        borderColor: item.iconBorder,
                      }
                    ]}
                  >
                    <Ionicons name={item.icon} size={30} color={item.iconColor} />
                  </Animated.View>

                  {/* Category Pill */}
                  <View style={[styles.categoryPill, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[styles.categoryText, { color: item.iconColor }]}>{item.badge}</Text>
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={[styles.slideTitle, { color: theme.primary }]}>{item.title}</Text>
                  <Text style={[styles.slideSubtitle, { color: theme.secondary }]}>{item.subtitle}</Text>

                  {/* Feature Cards Container */}
                  <View style={styles.featureList}>
                    {item.features.map((feat, fIdx) => (
                      <View
                        key={fIdx}
                        style={[
                          styles.featureCard,
                          {
                            backgroundColor: theme.isDark ? '#131317' : '#FFFFFF',
                            borderColor: theme.border,
                          }
                        ]}
                      >
                        <View style={[styles.featureIconCircle, { backgroundColor: item.iconBg }]}>
                          <Ionicons name={feat.icon} size={17} color={item.iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.featureTitle, { color: theme.primary }]}>{feat.title}</Text>
                          <Text style={[styles.featureDesc, { color: theme.secondary }]}>{feat.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          />

          {/* Desktop Right Navigation Chevron */}
          {isDesktop && currentIndex < SLIDES.length - 1 && (
            <TouchableOpacity
              style={[styles.desktopChevron, styles.desktopChevronRight, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleNext}
              activeOpacity={0.8}
              accessibilityLabel="Next Slide"
            >
              <Ionicons name="chevron-forward" size={20} color={theme.primary} />
            </TouchableOpacity>
          )}

        </View>

        {/* --- BOTTOM CONTROLS & CALLS TO ACTION --- */}
        <View style={[
          styles.footerContainer,
          {
            borderTopColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            paddingBottom: isDesktop ? 20 : bottomInset + 8,
          }
        ]}>
          
          {/* Interactive Clickable Pagination Dots */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((slide, i) => (
              <TouchableOpacity
                key={slide.id}
                onPress={() => goToSlide(i)}
                style={styles.dotTouchable}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${i + 1}`}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: currentIndex === i 
                        ? currentSlide.iconColor 
                        : (theme.isDark ? '#27272A' : '#CBD5E1'),
                      width: currentIndex === i ? 24 : 7,
                    }
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          {currentIndex < SLIDES.length - 1 ? (
            <View style={styles.actionGroup}>
              <View style={styles.actionRow}>
                {currentIndex > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.backBtn,
                      {
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                        borderColor: theme.border
                      }
                    ]}
                    onPress={handlePrev}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={15} color={theme.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.backBtnText, { color: theme.primary }]}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: theme.primary,
                      flex: 1,
                      marginLeft: currentIndex > 0 ? 10 : 0
                    }
                  ]}
                  onPress={handleNext}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.primaryBtnText, { color: theme.background }]}>Next</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.background} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.guestLinkBtn}
                onPress={handleUseWithoutSignIn}
                activeOpacity={0.75}
              >
                <Ionicons name="compass-outline" size={14} color={theme.secondary} style={{ marginRight: 5 }} />
                <Text style={[styles.guestLinkText, { color: theme.secondary }]}>
                  Use Without Sign In (Guest Demo)
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionGroup}>
              {/* Sign In / Register Primary Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                onPress={handleSignIn}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={18} color={theme.background} style={{ marginRight: 8 }} />
                <Text style={[styles.primaryBtnText, { color: theme.background }]}>
                  Sign In / Register Clinician
                </Text>
              </TouchableOpacity>

              {/* Use Without Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: theme.isDark ? '#141418' : '#FFFFFF',
                    borderColor: theme.border,
                  }
                ]}
                onPress={handleUseWithoutSignIn}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={16} color="#06B6D4" style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>
                  Use Without Sign In (Guest Demo)
                </Text>
              </TouchableOpacity>

              {/* Back to review previous slides button */}
              <TouchableOpacity
                style={styles.reviewSlidesBtn}
                onPress={() => goToSlide(SLIDES.length - 2)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={13} color={theme.secondary} style={{ marginRight: 4 }} />
                <Text style={[styles.reviewSlidesText, { color: theme.secondary }]}>
                  Review Features
                </Text>
              </TouchableOpacity>

              <Text style={[styles.footnoteText, { color: theme.secondary }]}>
                🔒 HIPAA §164 & GDPR Art. 9 Compliant Telemetry
              </Text>
            </View>
          )}

        </View>

      </View>
    </View>
  );
}

const getStyles = (theme, isDesktop, isTablet, slideWidth, windowHeight) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    width: '100%',
    maxWidth: isDesktop ? 520 : (isTablet ? 480 : '100%'),
    height: '100%',
    maxHeight: isDesktop ? Math.min(840, windowHeight - 40) : '100%',
    backgroundColor: theme.background,
    borderRadius: isDesktop ? 24 : 0,
    borderWidth: isDesktop ? 1 : 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDesktop ? 0.28 : 0,
    shadowRadius: 28,
    elevation: isDesktop ? 8 : 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIcon: {
    width: 30,
    height: 30,
  },
  brandWordmark: {
    width: 58,
    height: 18,
    marginLeft: 6,
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  skipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },

  // Carousel
  carouselContainer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopChevron: {
    position: 'absolute',
    top: '48%',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  desktopChevronLeft: {
    left: 10,
  },
  desktopChevronRight: {
    right: 10,
  },

  // Slide content
  slideOuter: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  slideSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },

  // Feature cards
  featureList: {
    width: '100%',
    maxWidth: 420,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 7,
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  featureTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Footer controls
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  dotTouchable: {
    paddingVertical: 6,
    paddingHorizontal: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  actionGroup: {
    width: '100%',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 12.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 11.5,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  guestLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  guestLinkText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  reviewSlidesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  reviewSlidesText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  footnoteText: {
    fontSize: 9.5,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.1,
  },
});
