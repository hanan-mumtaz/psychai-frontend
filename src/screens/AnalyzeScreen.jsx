import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  StatusBar, ActivityIndicator 
} from 'react-native';
import { InAppAlert as Alert } from '../../context/NotificationContext';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

// Import your Hybrid Edge processing service
import { processAndAnalyzeSession } from '../../services/Services';

export default function AnalyzeScreen({ navigation, route }) {
  // Grab URI if passed directly from a camera component, otherwise default to null
  const [videoUri, setVideoUri] = useState(route.params?.videoUri || null);
  const [videoName, setVideoName] = useState(route.params?.videoName || '');

  // State Management
  const [appState, setAppState] = useState('idle'); // 'idle' | 'processing' | 'complete'
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState(null);

  // --- STORAGE UPLOAD HANDLER ---
  const handlePickVideo = async () => {
    // Request system gallery permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Denied", "Psych.ai needs access to your gallery to upload sessions.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, // Strictly look for video formats
      allowsEditing: false,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets ?.[0]) {
      const selectedAsset = pickerResult.assets[0];
      setVideoUri(selectedAsset.uri);
      
      // Extract file name from the URI path
      const filename = selectedAsset.uri.split('/').pop();
      setVideoName(filename || 'Uploaded_Session.mp4');
    }
  };

  const handleStartAnalysis = async () => {
    if (!videoUri) {
      Alert.alert("Missing Media", "Please select or record a video first.");
      return;
    }

    setAppState('processing');
    try {
      // Execute the Hybrid Edge Pipeline with live UI updates
      const anonymityRes = await processAndAnalyzeSession(videoUri, (statusUpdate) => {
        setLoadingMessage(statusUpdate);
      });
      
      setResult(anonymityRes);
      setAppState('complete');
    } catch (error) {
      Alert.alert("Pipeline Failed", "There was an error analyzing the session.");
      setAppState('idle');
    }
  };

  const isDepressed = result?.diagnosis?.includes("Positive");
  const resultColors = isDepressed 
    ? { bg: 'rgba(184,92,92,0.18)', text: '#E07070', dot: '#E07070', border: 'rgba(184,92,92,0.3)' } 
    : { bg: 'rgba(74,155,142,0.18)', text: '#4A9B8E', dot: '#5BC4B5', border: 'rgba(74,155,142,0.3)' };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- HEADER --- */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.appSub}>AI Engine</Text>
          <Text style={styles.appLabel}>Evaluate Session</Text>
        </View>
        <View style={{ width: 38 }} />
      </Animated.View>

      <View style={styles.content}>
        {/* --- IDLE STATE --- */}
        {appState === 'idle' && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.stateContainer}>
            <BlurView intensity={25} tint="dark" style={styles.infoCard}>
              
              {videoUri ? (
                <>
                  <View style={[styles.iconWrapper, { backgroundColor: 'rgba(74,155,142,0.15)' }]}>
                    <Text style={styles.iconText}>✅</Text>
                  </View>
                  <Text style={styles.infoTitle}>Session Staged</Text>
                  <Text style={styles.fileNameText} numberOfLines={1}>{videoName || "Selected Raw Source"}</Text>
                  
                  <TouchableOpacity style={styles.changeFileBtn} onPress={handlePickVideo}>
                    <Text style={styles.changeFileText}>Choose Different Video</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.iconWrapper}>
                    <Text style={styles.iconText}>🎥</Text>
                  </View>
                  <Text style={styles.infoTitle}>No Video File Selected</Text>
                  <Text style={styles.infoSub}>
                    Extract clinical features directly from local files securely. Select an .mp4 session to execute model pipeline.
                  </Text>
                  
                  <TouchableOpacity style={styles.uploadPickerBtn} onPress={handlePickVideo} activeOpacity={0.7}>
                    <Text style={styles.uploadPickerText}>📂 Import from Mobile Storage</Text>
                  </TouchableOpacity>
                </>
              )}

            </BlurView>

            <TouchableOpacity 
              style={[styles.primaryButton, !videoUri && styles.buttonDisabled]} 
              onPress={handleStartAnalysis} 
              activeOpacity={0.85}
              disabled={!videoUri}
            >
              <Text style={styles.primaryButtonText}>Initiate Pipeline</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* --- PROCESSING STATE --- */}
        {appState === 'processing' && (
          <Animated.View entering={FadeInUp.springify()} style={styles.stateContainer}>
            <BlurView intensity={25} tint="dark" style={styles.processingCard}>
              <ActivityIndicator size="large" color="#7C6EAD" style={{ transform: [{ scale: 1.2 }] }} />
              <Text style={styles.processingTitle}>AI Evaluation in Progress</Text>
              
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{loadingMessage}</Text>
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* --- COMPLETE STATE --- */}
        {appState === 'complete' && result && (
          <Animated.View entering={FadeInUp.springify()} style={styles.stateContainer}>
            <BlurView intensity={30} tint="dark" style={[styles.resultCard, { borderColor: resultColors.border }]}>
              
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Diagnosis Report</Text>
                <View style={[styles.riskBadge, { backgroundColor: resultColors.bg }]}>
                  <View style={[styles.riskDot, { backgroundColor: resultColors.dot }]} />
                  <Text style={[styles.riskText, { color: resultColors.text }]}>
                    {isDepressed ? 'HIGH RISK' : 'LOW RISK'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Clinical Status</Text>
                <Text style={[styles.dataValue, { color: resultColors.text }]}>{result.diagnosis}</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Model Confidence</Text>
                <Text style={styles.dataValue}>{result.confidence}%</Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Primary Biomarker Timestamp</Text>
                <Text style={styles.dataValue}>{result.key_timestamp}</Text>
              </View>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.secondaryButtonText}>Return to Workspace</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#FFF', fontSize: 24, marginTop: -4 },
  headerTitles: { alignItems: 'center' },
  appSub: { color: '#444', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  appLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 2 },
  
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', paddingBottom: 60 },
  stateContainer: { width: '100%', alignItems: 'center' },
  
  // Idle Cards
  infoCard: { width: '100%', borderRadius: 20, padding: 24, backgroundColor: 'rgba(18,18,18,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', marginBottom: 30 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(124,110,173,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconText: { fontSize: 28 },
  infoTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  infoSub: { color: '#555', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10, marginBottom: 20 },
  fileNameText: { color: '#A897E8', fontSize: 14, fontWeight: '500', marginBottom: 14, textAlign: 'center', paddingHorizontal: 20 },
  
  // Custom Pickers
  uploadPickerBtn: { width: '90%', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  uploadPickerText: { color: '#B5A9E3', fontSize: 13, fontWeight: '600' },
  changeFileBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  changeFileText: { color: '#555', fontSize: 11, fontWeight: '500' },

  // Processing Cards
  processingCard: { width: '100%', borderRadius: 20, padding: 40, backgroundColor: 'rgba(18,18,18,0.9)', borderWidth: 1, borderColor: 'rgba(124,110,173,0.2)', alignItems: 'center' },
  processingTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 16 },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(124,110,173,0.15)', borderWidth: 1, borderColor: 'rgba(124,110,173,0.3)' },
  statusChipText: { color: '#A897E8', fontSize: 12, fontWeight: '600' },
  
  // Results Cards
  resultCard: { width: '100%', borderRadius: 20, padding: 24, backgroundColor: 'rgba(18,18,18,0.95)', borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  resultTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  riskBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  dataRow: { marginBottom: 16 },
  dataLabel: { color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dataValue: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  
  // Buttons
  primaryButton: { width: '100%', backgroundColor: '#7C6EAD', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#7C6EAD', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  buttonDisabled: { backgroundColor: 'rgba(124,110,173,0.2)', opacity: 0.5 },
  secondaryButton: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  secondaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' }
});