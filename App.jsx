import React, { Component } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🔴 Psych.ai ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>⚠️ Application Error</Text>
          <Text style={errStyles.message}>{this.state.error?.toString()}</Text>
          <ScrollView style={errStyles.stackBox}>
            <Text style={errStyles.stackText}>
              {this.state.error?.stack || JSON.stringify(this.state.errorInfo)}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B', padding: 24, justifyContent: 'center' },
  title: { color: '#FF4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  message: { color: '#FFFFFF', fontSize: 14, marginBottom: 16 },
  stackBox: { maxHeight: 300, backgroundColor: '#18181B', padding: 12, borderRadius: 8 },
  stackText: { color: '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }
});

const PsychAIPremiumTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary:      '#FFFFFF',
    background:   '#000000',
    card:         '#09090B',
    text:         '#FAFAFA',
    border:       'rgba(255,255,255,0.06)',
    notification: '#E11D48',
  },
};

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000000' }}>
      <ErrorBoundary>
        <AuthProvider>
          <SettingsProvider>
            <ThemeProvider>
              <NotificationProvider>
                <NavigationContainer theme={PsychAIPremiumTheme}>
                  <AppNavigator />
                </NavigationContainer>
              </NotificationProvider>
            </ThemeProvider>
          </SettingsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}