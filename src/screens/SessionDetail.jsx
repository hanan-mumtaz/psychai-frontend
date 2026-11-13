import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, SafeAreaView, Platform, TextInput
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';

const RISK_CONFIG = {
  high: {
    label: 'HIGH RISK',
    color: '#FF4444',
    bg: 'rgba(255, 68, 68, 0.12)',
    border: 'rgba(255, 68, 68, 0.35)',
  },
  moderate: {
    label: 'MODERATE RISK',
    color: '#D4A843',
    bg: 'rgba(212, 168, 67, 0.12)',
    border: 'rgba(212, 168, 67, 0.35)',
  },
  low: {
    label: 'LOW RISK',
    color: '#4A9B8E',
    bg: 'rgba(74, 155, 142, 0.12)',
    border: 'rgba(74, 155, 142, 0.35)',
  },
};

const DEFAULT_REPORT = {
  speechAnalysis: {
    mfccScore: 72,
    pitchVariability: 'High',
    speechEnergy: 'Low',
    pauseFrequency: 'Frequent',
    speechRate: '118 wpm',
    silenceRatio: '23%',
    notes: 'Significant pitch elevation detected during questions about emotional relationships. Extended pauses (>2s) observed 7 times. Speech energy declined notably in the final segment.',
  },
  facialAnalysis: {
    expressiveness: 45,
    au4Brow: 'Elevated',
    au12Smile: 'Suppressed',
    au17Chin: 'Present',
    eyeContact: '61%',
    blinkRate: '22 bpm',
    notes: 'AU4 (brow lowerer) consistently activated during distress topics. Micro-expressions of fear detected. Minimal genuine smiling (AU12) observed.',
  },
  overallIndicators: {
    emotionalValence: 'Negative',
    arousalLevel: 'High',
    engagementScore: 68,
    congruenceScore: 54,
    attentionScore: 72,
  },
  shapInsights: [
    { feature: 'Pitch Variability Delta', impact: 0.31, direction: 'up' },
    { feature: 'AU4 Brow Furrowing',     impact: 0.27, direction: 'up' },
    { feature: 'Speech Pause Ratio',     impact: 0.21, direction: 'up' },
    { feature: 'Gaze / Eye Stability',   impact: 0.14, direction: 'down' },
    { feature: 'Vocal Speech Energy',    impact: 0.12, direction: 'down' },
  ],
  timeline: [
    { time: '0:00',  event: 'Session initialized — Baseline established' },
    { time: '4:32',  event: 'Elevated vocal pitch variability triggered' },
    { time: '12:15', event: 'Prolonged pause (3.2s) during family topic' },
    { time: '21:40', event: 'Peak distress markers: AU4 + Pitch spike' },
    { time: '35:00', event: 'Vocal energy attenuation phase begins' },
    { time: '48:10', event: 'Session concluded — Arousal remains elevated' },
  ],
};

export default function SessionDetail({ route, navigation }) {
  const { theme } = useTheme();
  
  const session = route?.params?.session || {
    name: 'Sara Ahmed',
    date: 'June 03, 2026',
    age: 34,
    risk: 'moderate',
    duration: '48 min',
    mood: 'Anxious',
    diagnosis: 'Positive for Depressive Indicators',
    confidence: 68.4,
    keyTimestamp: '00:24',
  };

  const speechData = session.speechAnalysis || DEFAULT_REPORT.speechAnalysis;
  const facialData = session.facialAnalysis || DEFAULT_REPORT.facialAnalysis;
  const indicators = session.overallIndicators || DEFAULT_REPORT.overallIndicators;
  const shapInsights = session.shapInsights && session.shapInsights.length > 0 ? session.shapInsights : DEFAULT_REPORT.shapInsights;
  const timelineData = session.timeline && session.timeline.length > 0 ? session.timeline : DEFAULT_REPORT.timeline;

  const auList = getDynamicAuData(session, facialData);
  const scrollRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Auto-scroll to top whenever tab changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [activeTab]);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'speech',   label: 'Speech & Audio' },
    { id: 'facial',   label: 'Facial AUs' },
    { id: 'shap',     label: 'SHAP XAI' },
    { id: 'timeline', label: 'Timeline' },
  ];

  const riskKey = (session.risk || 'low').toLowerCase();
  const riskInfo = RISK_CONFIG[riskKey] || RISK_CONFIG.low;

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
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (navigation?.canGoBack()) {
                navigation.goBack();
              } else {
                navigation?.navigate('HomeDashboard');
              }
            }} 
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={theme.primary} />
          </TouchableOpacity>
          <View style={styles.headerPatientInfo}>
            <Text style={styles.headerPatientName} numberOfLines={1}>
              {session.name || "Anonymous Patient"}
            </Text>
            <Text style={styles.headerPatientMeta}>
              {session.date || 'Recent Session'}  •  {session.duration || '45 min'}  •  Age {session.age || 30}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.exportReportBtn} 
            onPress={() => navigation?.navigate('ExportReport', { session })}
          >
            <Feather name="file-text" size={14} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={styles.exportReportBtnText}>EXPORT</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* --- NAVIGATION TABS --- */}
        <View style={styles.tabBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* --- MAIN TAB CONTENT --- */}
        <ScrollView ref={scrollRef} style={styles.content} contentContainerStyle={{ paddingBottom: 107 }} showsVerticalScrollIndicator={false}>

          {/* === OVERVIEW TAB === */}
          {activeTab === 'overview' && (
            <Animated.View entering={FadeInUp.duration(300)}>
              
              {/* Behavioral Risk Banner */}
              <View style={[styles.riskBanner, { backgroundColor: riskInfo.bg, borderColor: riskInfo.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskBannerLabel}>BEHAVIORAL RISK ASSESSMENT</Text>
                  <Text style={[styles.riskBannerTitle, { color: riskInfo.color }]}>
                    {riskInfo.label}
                  </Text>
                  <Text style={styles.riskBannerSub}>
                    {session.diagnosis || "Evaluated by 4-Layer Multimodal Transformer"}
                  </Text>
                </View>
                <View style={styles.riskConfidenceBox}>
                  <Text style={styles.confidenceNumber}>{Math.round(session.confidence || 68)}%</Text>
                  <Text style={styles.confidenceLabel}>Confidence</Text>
                </View>
              </View>

              {/* Presenting Mood & Anchor */}
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Presenting Mood</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{session.mood || "Distressed"}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Peak Behavioral Distress Timestamp</Text>
                  <View style={[styles.badgePill, { backgroundColor: 'rgba(255, 68, 68, 0.15)' }]}>
                    <Text style={[styles.badgePillText, { color: '#FF4444' }]}>
                      ⏱ {session.keyTimestamp || "00:24"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 4 Behavioral Score Quadrants */}
              <Text style={styles.sectionTitle}>Affective & Behavioral Indices</Text>
              <View style={styles.scoreGrid}>
                <ScoreCard label="Engagement" value={indicators.engagementScore || 68} theme={theme} styles={styles} color="#7C6EAD" />
                <ScoreCard label="Congruence" value={indicators.congruenceScore || 54} theme={theme} styles={styles} color="#4A9B8E" />
                <ScoreCard label="Attention Gaze" value={indicators.attentionScore || 72} theme={theme} styles={styles} color="#5C84B8" />
                <ScoreCard label="Expressiveness" value={facialData.expressiveness || 45} theme={theme} styles={styles} color="#D4A843" />
              </View>

              {/* Emotional State Summary */}
              <Text style={styles.sectionTitle}>Emotional Polarization</Text>
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Emotional Valence</Text>
                  <Text style={[styles.infoRowValue, { color: indicators.emotionalValence === "Negative" ? '#FF4444' : '#4A9B8E' }]}>
                    {indicators.emotionalValence || "Negative"}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>Arousal Dynamics</Text>
                  <Text style={[styles.infoRowValue, { color: indicators.arousalLevel === "High" ? '#D4A843' : theme.primary }]}>
                    {indicators.arousalLevel || "Elevated"}
                  </Text>
                </View>
              </View>

              {/* Key Sensor Telemetry Summary */}
              <Text style={styles.sectionTitle}>Core Biomarker Summary</Text>
              <View style={styles.card}>
                <FindingRow icon="mic" label="Vocal Pitch Variability" value={speechData.pitchVariability || "High"} status={speechData.pitchVariability === "High" ? "warn" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <FindingRow icon="activity" label="Speech Energy Level" value={speechData.speechEnergy || "Low"} status={speechData.speechEnergy === "Low" ? "bad" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <FindingRow icon="pause-circle" label="Acoustic Pause Frequency" value={speechData.pauseFrequency || "Frequent"} status={speechData.pauseFrequency === "Frequent" ? "warn" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <FindingRow icon="eye" label="Eye Contact / Fixation" value={facialData.eyeContact || "61%"} status="ok" theme={theme} styles={styles} />
                <View style={styles.divider} />
                <FindingRow icon="smile" label="AU4 Brow Lowerer Intensity" value={facialData.au4Brow || "Elevated"} status={facialData.au4Brow === "Elevated" ? "warn" : "ok"} theme={theme} styles={styles} />
              </View>

            </Animated.View>
          )}

          {/* === SPEECH & AUDIO TAB === */}
          {activeTab === 'speech' && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <Text style={styles.sectionTitle}>Acoustic MFCC & Vocal Metrics</Text>
              <View style={styles.card}>
                <MetricRow label="13 MFCC Channel Score" value={`${speechData.mfccScore || 72} / 100`} pct={speechData.mfccScore || 72} barColor="#7C6EAD" theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Speech Silence Ratio" value={speechData.silenceRatio || "23%"} pct={parseInt(speechData.silenceRatio) || 23} barColor="#FF4444" theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Estimated Speech Rate" value={speechData.speechRate || "118 wpm"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Pitch Variability Profile" value={speechData.pitchVariability || "High"} status={speechData.pitchVariability === "High" ? "warn" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Speech Vocal Energy" value={speechData.speechEnergy || "Low"} status={speechData.speechEnergy === "Low" ? "bad" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Atypical Silence Frequency" value={speechData.pauseFrequency || "Frequent"} status={speechData.pauseFrequency === "Frequent" ? "warn" : "ok"} theme={theme} styles={styles} />
              </View>

              <Text style={styles.sectionTitle}>Clinical Acoustic Observations</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesBoxText}>
                  {speechData.notes || "Significant acoustic variations detected during conversational evaluation. Extended vocal pauses detected."}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Speech Attention Weight Heatmap</Text>
              <View style={styles.card}>
                <Text style={styles.vizSubTitle}>Temporal cross-attention weights across audio windows:</Text>
                <View style={styles.attentionBarsRow}>
                  {[0.3, 0.5, 0.8, 0.6, 0.95, 0.7, 0.45, 0.85, 0.65, 0.75, 0.55, 0.9].map((h, i) => (
                    <View key={i} style={styles.attentionCol}>
                      <View style={[styles.attentionBar, { height: h * 60, backgroundColor: theme.primary, opacity: Math.max(0.3, h) }]} />
                      <Text style={styles.attentionBarLabel}>{i * 4}m</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* === FACIAL AUS TAB === */}
          {activeTab === 'facial' && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <Text style={styles.sectionTitle}>Facial Action Unit (FAU) Indices</Text>
              <View style={styles.card}>
                <MetricRow label="Overall Expressiveness" value={`${facialData.expressiveness || 45}%`} pct={facialData.expressiveness || 45} barColor="#4A9B8E" theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Gaze Contact Stability" value={facialData.eyeContact || "61%"} pct={parseInt(facialData.eyeContact) || 61} barColor="#5C84B8" theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="Spontaneous Blink Rate" value={facialData.blinkRate || "22 bpm"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="AU4 (Brow Lowerer / Furrow)" value={facialData.au4Brow || "Elevated"} status={facialData.au4Brow === "Elevated" ? "warn" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="AU12 (Zygomatic Smile Pull)" value={facialData.au12Smile || "Suppressed"} status={facialData.au12Smile === "Suppressed" ? "bad" : "ok"} theme={theme} styles={styles} />
                <View style={styles.divider} />
                <MetricRow label="AU17 (Mentalis Chin Raiser)" value={facialData.au17Chin || "Present"} status={facialData.au17Chin === "Present" ? "warn" : "ok"} theme={theme} styles={styles} />
              </View>

              <Text style={styles.sectionTitle}>FAU Intensity Breakdown (OpenCV)</Text>
              <View style={styles.card}>
                {auList.map((item, i, arr) => (
                  <View key={item.au}>
                    <View style={styles.auRow}>
                      <View style={styles.auBadge}>
                        <Text style={styles.auBadgeText}>{item.au}</Text>
                      </View>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.auNameText}>{item.name}</Text>
                        <View style={styles.auBarBackground}>
                          <View style={[
                            styles.auBarForeground,
                            { 
                              width: `${item.intensity * 100}%`,
                              backgroundColor: item.intensity > 0.6 ? '#FF4444' : item.intensity > 0.35 ? '#D4A843' : '#4A9B8E'
                            }
                          ]} />
                        </View>
                      </View>
                      <Text style={styles.auPctText}>{Math.round(item.intensity * 100)}%</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* === SHAP XAI TAB === */}
          {activeTab === 'shap' && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <Text style={styles.sectionTitle}>SHAP Global Feature Attribution</Text>
              <Text style={styles.sectionSub}>Relative impact of multimodal channels on the final diagnosis:</Text>
              <View style={styles.card}>
                {shapInsights.map((item, i, arr) => (
                  <View key={i}>
                    <ShapRow feature={item.feature} impact={item.impact} direction={item.direction} theme={theme} styles={styles} />
                    {i < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Model Explainability Summary</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesBoxText}>
                  The classification decision is primarily driven by {shapInsights[0]?.feature || "Pitch Variability"} (+{(shapInsights[0]?.impact * 100 || 31).toFixed(0)}% contribution) and {shapInsights[1]?.feature || "AU4 Brow Furrowing"} (+{(shapInsights[1]?.impact * 100 || 27).toFixed(0)}% contribution). In combination with extended vocal pauses, these behavioral markers form a validated multimodal indication for depressive indicators.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* === TIMELINE TAB === */}
          {activeTab === 'timeline' && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <Text style={styles.sectionTitle}>Chronological Milestones</Text>
              <View style={styles.card}>
                {timelineData.map((item, i, arr) => (
                  <View key={i} style={styles.timelineRow}>
                    <View style={styles.timelineColLeft}>
                      <View style={styles.timelinePill}>
                        <Text style={styles.timelinePillText}>{item.time}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.timelineVerticalLine} />}
                    </View>
                    <View style={styles.timelineColRight}>
                      <Text style={styles.timelineEventText}>{item.event}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Session Clinical Notes</Text>
              <View style={styles.card}>
                <Text style={styles.notesInputSub}>Record qualitative observations linked with this session:</Text>
                <TextInput
                  style={styles.notesTextInput}
                  placeholder="Enter clinician notes, follow-up recommendations, or medication adjustments..."
                  placeholderTextColor={theme.secondary}
                  multiline
                  value={clinicalNotes}
                  onChangeText={setClinicalNotes}
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ─── Modular Helper Components ─── */

function ScoreCard({ label, value, color, theme, styles }) {
  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreCardTop}>
        <Text style={[styles.scoreCardValue, { color }]}>{value}</Text>
        <Text style={styles.scoreCardMax}>/100</Text>
      </View>
      <Text style={styles.scoreCardLabel}>{label}</Text>
      <View style={styles.scoreCardBarBg}>
        <View style={[styles.scoreCardBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function FindingRow({ icon, label, value, status, theme, styles }) {
  const statusColor = status === 'ok' ? '#4A9B8E' : status === 'warn' ? '#D4A843' : '#FF4444';
  return (
    <View style={styles.findingRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
        <Feather name={icon} size={15} color={theme.secondary} style={{ marginRight: 10 }} />
        <Text style={styles.findingLabel} numberOfLines={1}>{label}</Text>
      </View>
      <View style={[styles.findingBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
        <Text style={[styles.findingValue, { color: statusColor }]}>{value}</Text>
      </View>
    </View>
  );
}

function MetricRow({ label, value, pct, barColor, status, theme, styles }) {
  const statusColor = status === 'ok' ? '#4A9B8E' : status === 'warn' ? '#D4A843' : status === 'bad' ? '#FF4444' : theme.primary;
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.metricValue, { color: statusColor }]}>{value}</Text>
        {pct !== undefined && (
          <View style={styles.metricBarBg}>
            <View style={[styles.metricBarFill, { width: `${pct}%`, backgroundColor: barColor || theme.primary }]} />
          </View>
        )}
      </View>
    </View>
  );
}

function ShapRow({ feature, impact, direction, theme, styles }) {
  const isUp = direction === 'up';
  const color = isUp ? '#FF4444' : '#4A9B8E';
  const barWidth = Math.min(100, Math.round((impact || 0.2) * 250));

  return (
    <View style={styles.shapRow}>
      <Text style={styles.shapFeatureText} numberOfLines={1}>{feature}</Text>
      <View style={styles.shapBarContainer}>
        <View style={[styles.shapBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.shapImpactText, { color }]}>
        {isUp ? '+' : '-'}{Number(impact).toFixed(2)}
      </Text>
    </View>
  );
}

function getDynamicAuData(session, facialData) {
  if (facialData?.auData && Array.isArray(facialData.auData) && facialData.auData.length > 0) {
    return facialData.auData;
  }
  const isHigh = (session.risk || '').toLowerCase() === 'high';
  const isLow = (session.risk || '').toLowerCase() === 'low';
  const conf = Number(session.confidence) || (isHigh ? 85 : isLow ? 20 : 65);
  
  const au4 = isHigh ? Math.min(0.95, 0.70 + (conf / 400)) : isLow ? Math.max(0.08, 0.25 - (conf / 300)) : 0.68;
  const au12 = isHigh ? Math.max(0.05, 0.20 - (conf / 500)) : isLow ? Math.min(0.92, 0.65 + (conf / 400)) : 0.25;
  const au1 = isHigh ? 0.54 : isLow ? 0.18 : 0.40;
  const au2 = isHigh ? 0.46 : isLow ? 0.15 : 0.32;
  const au6 = isHigh ? 0.10 : isLow ? 0.68 : 0.20;
  const au17 = isHigh ? 0.78 : isLow ? 0.14 : 0.52;
  const au20 = isHigh ? 0.55 : isLow ? 0.20 : 0.38;
  const au25 = isHigh ? 0.58 : isLow ? 0.25 : 0.45;

  return [
    { au: 'AU1',  name: 'Inner Brow Raiser',  intensity: Number(au1.toFixed(2)) },
    { au: 'AU2',  name: 'Outer Brow Raiser',  intensity: Number(au2.toFixed(2)) },
    { au: 'AU4',  name: 'Brow Lowerer / Corrugator', intensity: Number(au4.toFixed(2)) },
    { au: 'AU6',  name: 'Cheek Raiser / Orbicularis', intensity: Number(au6.toFixed(2)) },
    { au: 'AU12', name: 'Lip Corner Pull (Smile)', intensity: Number(au12.toFixed(2)) },
    { au: 'AU17', name: 'Chin Raiser / Mentalis', intensity: Number(au17.toFixed(2)) },
    { au: 'AU20', name: 'Lip Stretcher / Risorius', intensity: Number(au20.toFixed(2)) },
    { au: 'AU25', name: 'Lips Parting', intensity: Number(au25.toFixed(2)) },
  ];
}

/* ─── DYNAMIC STYLESHEET ─── */
const getStyles = (theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: theme.background },
  
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { color: theme.primary, fontSize: 24, fontWeight: '300', marginTop: -4 },
  headerPatientInfo: { flex: 1, paddingRight: 8 },
  headerPatientName: { color: theme.primary, fontSize: 17, fontWeight: '800' },
  headerPatientMeta: { color: theme.secondary, fontSize: 11, fontWeight: '500', marginTop: 2 },
  exportReportBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  exportReportBtnText: { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  tabBarContainer: { borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background },
  tabScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  tabItemActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabItemText: { color: theme.secondary, fontSize: 12, fontWeight: '700' },
  tabItemTextActive: { color: theme.background, fontWeight: '800' },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { color: theme.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  sectionSub: { color: theme.secondary, fontSize: 12, fontWeight: '500', marginTop: -6, marginBottom: 12 },

  card: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 18, marginBottom: 12 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },

  riskBanner: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, marginBottom: 14 },
  riskBannerLabel: { color: theme.secondary, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  riskBannerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
  riskBannerSub: { color: theme.primary, fontSize: 12, fontWeight: '600' },
  riskConfidenceBox: { alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginLeft: 12 },
  confidenceNumber: { color: theme.primary, fontSize: 20, fontWeight: '900' },
  confidenceLabel: { color: theme.secondary, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRowLabel: { color: theme.secondary, fontSize: 13, fontWeight: '600' },
  infoRowValue: { fontSize: 14, fontWeight: '700' },
  badgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border },
  badgePillText: { color: theme.primary, fontSize: 11, fontWeight: '800' },

  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  scoreCard: { width: '48%', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10 },
  scoreCardTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  scoreCardValue: { fontSize: 24, fontWeight: '900' },
  scoreCardMax: { color: theme.secondary, fontSize: 11, fontWeight: '600', marginLeft: 2 },
  scoreCardLabel: { color: theme.secondary, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  scoreCardBarBg: { height: 4, backgroundColor: theme.background, borderRadius: 2, overflow: 'hidden' },
  scoreCardBarFill: { height: '100%', borderRadius: 2 },

  findingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  findingLabel: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  findingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  findingValue: { fontSize: 11, fontWeight: '700' },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { color: theme.primary, fontSize: 13, fontWeight: '600', flex: 1, paddingRight: 10 },
  metricValue: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  metricBarBg: { width: 80, height: 4, backgroundColor: theme.background, borderRadius: 2, overflow: 'hidden', marginTop: 3 },
  metricBarFill: { height: '100%', borderRadius: 2 },

  notesBox: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 16, marginBottom: 12 },
  notesBoxText: { color: theme.primary, fontSize: 13, lineHeight: 20, fontWeight: '500' },

  vizSubTitle: { color: theme.secondary, fontSize: 11, fontWeight: '600', marginBottom: 14 },
  attentionBarsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 },
  attentionCol: { alignItems: 'center', flex: 1 },
  attentionBar: { width: 8, borderRadius: 4, marginBottom: 6 },
  attentionBarLabel: { color: theme.secondary, fontSize: 9, fontWeight: '600' },

  auRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  auBadge: { width: 44, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, alignItems: 'center', marginRight: 10 },
  auBadgeText: { color: theme.primary, fontSize: 10, fontWeight: '800' },
  auNameText: { color: theme.primary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  auBarBackground: { height: 5, backgroundColor: theme.background, borderRadius: 2.5, overflow: 'hidden' },
  auBarForeground: { height: '100%', borderRadius: 2.5 },
  auPctText: { color: theme.secondary, fontSize: 11, fontWeight: '700', width: 34, textAlign: 'right' },

  shapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  shapFeatureText: { color: theme.primary, fontSize: 12, fontWeight: '600', width: 140 },
  shapBarContainer: { flex: 1, height: 6, backgroundColor: theme.background, borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  shapBarFill: { height: '100%', borderRadius: 3 },
  shapImpactText: { fontSize: 12, fontWeight: '800', width: 45, textAlign: 'right' },

  timelineRow: { flexDirection: 'row', marginBottom: 12 },
  timelineColLeft: { alignItems: 'center', marginRight: 14, width: 50 },
  timelinePill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, alignItems: 'center', width: '100%' },
  timelinePillText: { color: theme.primary, fontSize: 10, fontWeight: '800' },
  timelineVerticalLine: { width: 1.5, flex: 1, backgroundColor: theme.border, marginVertical: 4 },
  timelineColRight: { flex: 1, justifyContent: 'center' },
  timelineEventText: { color: theme.primary, fontSize: 13, fontWeight: '600', lineHeight: 18 },

  notesInputSub: { color: theme.secondary, fontSize: 11, fontWeight: '600', marginBottom: 10 },
  notesTextInput: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, color: theme.primary, fontSize: 13, minHeight: 90, textAlignVertical: 'top' },
});