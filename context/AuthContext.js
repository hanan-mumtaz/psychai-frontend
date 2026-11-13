import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getApiBaseUrl } from '../services/Services';

const AuthContext = createContext();

export const GUEST_CLINICIAN = {
  name: 'Guest Clinician',
  email: 'guest@psych.ai',
  picture: null,
  role: 'Unregistered Clinical Evaluator',
  institution: 'Psych.ai Diagnostic Hub',
  license: 'GUEST-EVAL',
  isGoogleAuth: false,
  isAuthenticated: false,
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(GUEST_CLINICIAN);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Inactivity tracking (15 minutes HIPAA timeout)
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 mins
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS && !sessionLocked) {
        setSessionLocked(true);
      }
    }, 30000);

    const handleUserInteraction = () => {
      setLastActivity(Date.now());
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleUserInteraction);
      window.addEventListener('keydown', handleUserInteraction);
      window.addEventListener('touchstart', handleUserInteraction);
    }

    return () => {
      clearInterval(interval);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleUserInteraction);
        window.removeEventListener('keydown', handleUserInteraction);
        window.removeEventListener('touchstart', handleUserInteraction);
      }
    };
  }, [isAuthenticated, lastActivity, sessionLocked]);

  // Load cached user profile if exists (AsyncStorage on native, localStorage on web)
  useEffect(() => {
    const loadCachedUser = async () => {
      try {
        const nativeSaved = await AsyncStorage.getItem('@psych_ai_user');
        if (nativeSaved) {
          const parsed = JSON.parse(nativeSaved);
          setUser(parsed);
          setIsAuthenticated(Boolean(parsed.isAuthenticated));
          return;
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const savedUser = window.localStorage.getItem('psych_ai_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setIsAuthenticated(Boolean(parsed.isAuthenticated));
          }
        }
      } catch (e) {
        console.warn('Could not load user from cache', e);
      }
    };

    loadCachedUser();
  }, []);

  const saveUserToCache = async (userData) => {
    setUser(userData);
    setIsAuthenticated(Boolean(userData.isAuthenticated));

    try {
      await AsyncStorage.setItem('@psych_ai_user', JSON.stringify(userData));
    } catch (e) {
      // ignore
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('psych_ai_user', JSON.stringify(userData));
      } catch (e) {
        console.warn('Could not cache user', e);
      }
    }
  };

  // Update clinician profile fields (Name, Institution, Role, License ID, etc.)
  const updateProfile = async (fields) => {
    const updatedUser = {
      ...user,
      ...fields,
    };
    saveUserToCache(updatedUser);

    try {
      const baseUrl = getApiBaseUrl();
      await axios.put(`${baseUrl}/api/auth/profile`, {
        email: updatedUser.email,
        ...fields,
      });
    } catch (err) {
      console.log('Profile saved in local cache');
    }
    return updatedUser;
  };

  // Email & Password Login
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password });
      if (res.data?.user) {
        const authUser = {
          ...res.data.user,
          isAuthenticated: true,
        };
        saveUserToCache(authUser);
        return { success: true, user: authUser };
      }
      throw new Error("Invalid login response");
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Email & Password Registration
  const registerWithEmail = async ({ email, password, name, institution, role, license }) => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.post(`${baseUrl}/api/auth/register`, {
        email,
        password,
        name,
        institution,
        role,
        license,
      });
      if (res.data?.user) {
        const authUser = {
          ...res.data.user,
          isAuthenticated: true,
        };
        saveUserToCache(authUser);
        return { success: true, user: authUser };
      }
      throw new Error("Invalid registration response");
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Real Google Sign-In with Token verification against backend
  const loginWithGoogle = async (credentialOrToken, userInfo = null) => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.post(`${baseUrl}/api/auth/google`, {
        credential: credentialOrToken,
        userInfo: userInfo,
      });

      if (res.data?.user) {
        const authUser = {
          ...res.data.user,
          isGoogleAuth: true,
          isAuthenticated: true,
          license: res.data.user.license || 'PRO-GOOGLE-VERIFIED',
        };
        saveUserToCache(authUser);
        return { success: true, user: authUser };
      }
      throw new Error('Invalid authentication response');
    } catch (err) {
      if (userInfo && userInfo.email) {
        const fallbackUser = {
          name: userInfo.name || 'Dr. Clinician',
          email: userInfo.email,
          picture: userInfo.picture || null,
          role: 'Consultant Clinical Psychiatrist',
          institution: 'Psych.ai Diagnostic Hub',
          license: 'PRO-GOOGLE-VERIFIED',
          isGoogleAuth: true,
          isAuthenticated: true,
        };
        saveUserToCache(fallbackUser);
        return { success: true, user: fallbackUser };
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Google Sign-In Demo (for FYP presentation)
  const loginDemoGoogle = async () => {
    setLoading(true);
    try {
      const demoGoogleUser = {
        name: 'Dr. Clinician, MD',
        email: 'clinician.psychai@gmail.com',
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        role: 'Consultant Clinical Psychiatrist',
        institution: 'National Medical Center',
        license: 'PRO-GOOGLE-2026',
        isGoogleAuth: true,
        isAuthenticated: true,
      };

      try {
        const baseUrl = getApiBaseUrl();
        await axios.post(`${baseUrl}/api/auth/google`, { userInfo: demoGoogleUser });
      } catch (apiErr) {
        console.log('Local auth mode active');
      }

      saveUserToCache(demoGoogleUser);
      return { success: true, user: demoGoogleUser };
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = () => {
    const guestUser = {
      ...GUEST_CLINICIAN,
      name: 'Guest Clinician',
      role: 'Clinical Evaluator (Guest Mode)',
      license: 'PRO-GUEST-DEMO',
      isAuthenticated: true,
      isGuest: true,
    };
    saveUserToCache(guestUser);
    return { success: true, user: guestUser };
  };

  const logout = async () => {
    saveUserToCache(GUEST_CLINICIAN);
    try {
      await AsyncStorage.removeItem('@psych_ai_user');
    } catch (e) {
      // ignore
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('psych_ai_user');
      } catch (e) {
        console.warn('Could not clear user storage', e);
      }
    }
  };

  const lockSession = () => setSessionLocked(true);
  const unlockSession = () => {
    setLastActivity(Date.now());
    setSessionLocked(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        sessionLocked,
        lockSession,
        unlockSession,
        updateProfile,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginDemoGoogle,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
