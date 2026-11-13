import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, SafeAreaView, Platform
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

// Import Global Theme Hook
import { useTheme } from '../../context/ThemeContext';

const TREND_DATA = {
  engagement:     [60, 65, 58, 72, 68, 74, 71, 78, 70, 75, 68, 80],
  speechEnergy:  [45, 50, 42, 55, 48, 60, 52, 58, 50, 63, 55, 65],
  facialExpress: [30, 35, 32, 40, 38, 45, 42, 48, 44, 50, 46, 52],
  riskScore:     [70, 65, 72, 60, 68, 55, 62, 50, 58, 45, 55, 42],
};

const MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];

export default function AnalyticsScreen({ navigation }) {
  const { theme } = useTheme();
  const [metric, setMetric] = useState('engagement');
  const [range, setRange] = useState('3m');

  const currentData = TREND_DATA[metric];
  const displayData = range === '1m' ? currentData.slice(-4)
    : range === '3m' ? currentData.slice(-6)
    : currentData;

  const maxVal = Math.max(...displayData);
  const minVal = Math.min(...displayData);

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
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <TouchableOpacity 
            style={[styles.filterBtn, { flexDirection: 'row', alignItems: 'center' }]} 
            onPress={() => setRange(r => r === '1m' ? '3m' : r === '3m' ? '12m' : '1m')}
            activeOpacity={0.8}
          >
            <Feather name="filter" size={11} color={theme.primary} style={{ marginRight: 5 }} />
            <Text style={styles.filterText}>AUDIT FILTER</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 125 : 105 }} showsVerticalScrollIndicator={false}>

          {/* --- SUMMARY COHORT METRICS --- */}
          <Animated.View entering={FadeInUp.delay(50).duration(400)}>
            <Text style={styles.sectionTitle}>Cohort Summary</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollPadRight}>
              <KpiCard label="Avg Engagement" value="71%" delta="+6%" theme={theme} styles={styles} />
              <KpiCard label="High Risk Active" value="02" delta="-1 case" theme={theme} styles={styles} inverted />
              <KpiCard label="Avg Session Time" value="43m" delta="+3m" theme={theme} styles={styles} />
              <KpiCard label="Audits This Month" value="12" delta="+4 new" theme={theme} styles={styles} />
            </ScrollView>
          </Animated.View>

          {/* --- TREND ANALYSIS CONTROLS --- */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <Text style={styles.sectionTitle}>Telemetry Vectors</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollPadRight}>
              {[
                { id: 'engagement',    label: 'ENGAGEMENT' },
                { id: 'speechEnergy',  label: 'SPEECH ENERGY' },
                { id: 'facialExpress', label: 'EXPRESSIVENESS' },
                { id: 'riskScore',     label: 'RISK SCORE' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.metricTab, metric === m.id && styles.metricTabActive]}
                  onPress={() => setMetric(m.id)}
                >
                  <Text style={[styles.metricTabText, metric === m.id && styles.metricTabTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* --- CUSTOM GRAPH CARD PANEL --- */}
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <View style={styles.chartCard}>
              <View style={styles.rangeRow}>
                {['1m','3m','12m'].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rangeBtn, range === r && styles.rangeBtnActive]}
                    onPress={() => setRange(r)}
                  >
                    <Text style={[styles.rangeBtnText, range === r && styles.rangeBtnTextActive]}>{r.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.chartArea}>
                <View style={styles.yAxis}>
                  <Text style={styles.yLabel}>{maxVal}%</Text>
                  <Text style={styles.yLabel}>{Math.round((maxVal + minVal) / 2)}%</Text>
                  <Text style={styles.yLabel}>{minVal}%</Text>
                </View>
                
                <View style={styles.bars}>
                  {displayData.map((val, i) => {
                    const heightPct = ((val - minVal) / (maxVal - minVal || 1)) * 100 + 10;
                    const months = range === '1m' ? MONTHS.slice(-4) : range === '3m' ? MONTHS.slice(-6) : MONTHS;
                    const isLastBar = i === displayData.length - 1;

                    return (
                      <View key={i} style={styles.barWrapper}>
                        <View style={styles.barCol}>
                          <View style={[
                            styles.bar, 
                            { height: `${heightPct}%` },
                            isLastBar ? styles.barPrimary : styles.barMuted
                          ]} />
                        </View>
                        <Text style={styles.barLabel}>{months[i].toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* --- RISK COEFFICIENT DISTRIBUTION --- */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <Text style={styles.sectionTitle}>Risk Classification Split</Text>
            <View style={styles.riskDistCard}>
              <RiskBar label="CRITICAL HIGH" count={2} total={12} theme={theme} styles={styles} highlightAlert />
              <RiskBar label="MODERATE COHORT" count={5} total={12} theme={theme} styles={styles} />
              <RiskBar label="STABLE LOW" count={5} total={12} theme={theme} styles={styles} />
            </View>
          </Animated.View>

          {/* --- CRITICAL BIOMARKER FLAGS --- */}
          <Animated.View entering={FadeInUp.delay(250).duration(400)}>
            <Text style={styles.sectionTitle}>Most Flagged Neural Features</Text>
            <View style={styles.featuresCard}>
              {[
                { name: 'Pitch Variability Delta',   count: 8, pct: 67 },
                { name: 'Atypical Speech Pauses',      count: 7, pct: 58 },
                { name: 'AU4 Brow Lowerer Intensity',  count: 6, pct: 50 },
                { name: 'Attenuated Vocal Energy',    count: 5, pct: 42 },
                { name: 'Diminished Fixation Vectors', count: 4, pct: 33 },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureRank}>0{i + 1}</Text>
                  <View style={styles.featureInfo}>
                    <View style={styles.featureTopRow}>
                      <Text style={styles.featureName}>{f.name}</Text>
                      <Text style={styles.featureCount}>{f.count} RUNS</Text>
                    </View>
                    <View style={styles.featureBarBg}>
                      <View style={[styles.featureBarFill, { width: `${f.pct}%` }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* --- PIPELINE AUDIT LOGS --- */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <Text style={styles.sectionTitle}>System Activity Logs</Text>
            <View style={styles.activityCard}>
              {[
                { text: 'Case file S. Ahmed — Telemetry tracking finished', time: '2h ago' },
                { text: 'Case file O. Khalid — Edge ingestion complete',     time: '5h ago' },
                { text: 'Case file L. Hassan — High risk score flagged',      time: '1d ago', alert: true },
                { text: 'Case file Y. Malik — Encrypted PDF audit compiled', time: '2d ago' },
              ].map((a, i) => (
                <View key={i} style={styles.activityRow}>
                  <View style={[styles.activityDot, a.alert && styles.activityDotAlert]} />
                  <Text style={styles.activityText} numberOfLines={1}>{a.text}</Text>
                  <Text style={styles.activityTime}>{a.time.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* --- STATS CARD SUBCONTAINER --- */
function KpiCard({ label, value, delta, theme, styles, inverted }) {
  return (
    <View style={[styles.kpiCard, inverted && styles.kpiCardInverted]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, inverted && styles.kpiValueAlert]}>{value}</Text>
      <Text style={[styles.kpiDelta, inverted && styles.kpiDeltaAlert]}>{delta}</Text>
    </View>
  );
}

/* --- RISK PROGRESS BAR LINE --- */
function RiskBar({ label, count, total, theme, styles, highlightAlert }) {
  const pct = Math.round((count / total) * 100);
  return (
    <View style={styles.riskBarWrapper}>
      <View style={styles.riskBarHeader}>
        <Text style={[styles.riskBarLabel, highlightAlert && styles.riskBarLabelAlert]}>{label}</Text>
        <Text style={styles.riskBarValue}>{count} cases ({pct}%)</Text>
      </View>
      <View style={styles.riskBarBg}>
        <View style={[
          styles.riskBarFill, 
          { width: `${pct}%` },
          highlightAlert ? styles.riskBarFillAlert : styles.riskBarFillNormal
        ]} />
      </View>
    </View>
  );
}

/* --- DYNAMIC STYLESHEET --- */
const getStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: { color: theme.primary, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: theme.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
    paddingLeft: 2,
  },
  scrollPadRight: {
    paddingRight: 24,
    gap: 12,
    paddingBottom: 8,
  },

  kpiCard: {
    width: 140,
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  kpiCardInverted: {
    borderColor: 'rgba(255, 68, 68, 0.4)',
    backgroundColor: theme.isDark ? '#140A0A' : '#FFF5F5',
  },
  kpiLabel: {
    color: theme.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  kpiValue: {
    color: theme.primary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  kpiValueAlert: {
    color: '#FF4444',
  },
  kpiDelta: {
    color: theme.secondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  kpiDeltaAlert: {
    color: '#FF4444',
  },

  metricTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metricTabActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  metricTabText: {
    color: theme.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricTabTextActive: {
    color: theme.background,
    fontWeight: '800',
  },

  chartCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 16,
  },
  rangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rangeBtnActive: {
    backgroundColor: theme.primary,
  },
  rangeBtnText: {
    color: theme.secondary,
    fontSize: 9,
    fontWeight: '700',
  },
  rangeBtnTextActive: {
    color: theme.background,
    fontWeight: '800',
  },

  chartArea: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
  },
  yAxis: {
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 12,
    paddingBottom: 24,
  },
  yLabel: {
    color: theme.secondary,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCol: {
    flex: 1,
    width: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barPrimary: {
    backgroundColor: theme.primary,
  },
  barMuted: {
    backgroundColor: theme.isDark ? '#27272A' : '#E4E4E7',
  },
  barLabel: {
    color: theme.secondary,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.5,
  },

  riskDistCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 16,
  },
  riskBarWrapper: {
    width: '100%',
  },
  riskBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskBarLabel: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  riskBarLabelAlert: {
    color: '#FF4444',
  },
  riskBarValue: {
    color: theme.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  riskBarBg: {
    height: 6,
    backgroundColor: theme.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  riskBarFillAlert: {
    backgroundColor: '#FF4444',
  },
  riskBarFillNormal: {
    backgroundColor: theme.primary,
  },

  featuresCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureRank: {
    color: theme.secondary,
    fontSize: 12,
    fontWeight: '800',
    width: 28,
  },
  featureInfo: {
    flex: 1,
  },
  featureTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureName: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  featureCount: {
    color: theme.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureBarBg: {
    height: 4,
    backgroundColor: theme.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  featureBarFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 2,
  },

  activityCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.primary,
    marginRight: 12,
  },
  activityDotAlert: {
    backgroundColor: '#FF4444',
  },
  activityText: {
    flex: 1,
    color: theme.primary,
    fontSize: 12,
    fontWeight: '500',
    paddingRight: 10,
  },
  activityTime: {
    color: theme.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});