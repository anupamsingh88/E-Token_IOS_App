import React, { useState, useEffect, lazy, Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Alert, Platform, AppState, StyleSheet, InteractionManager, BackHandler } from 'react-native';
import SplashScreenComponent from './src/screens/SplashScreen';
// Lazy load screens for code splitting
const FarmerRegistrationScreen = lazy(() => import('./src/screens/Farmer/FarmerRegistrationScreen'));
const FarmerLoginScreen = lazy(() => import('./src/screens/Farmer/FarmerLoginScreen'));
const FarmerDashboard = lazy(() => import('./src/screens/Farmer/FarmerDashboard'));

const SlotBookingScreen = lazy(() => import('./src/screens/Farmer/SlotBookingScreen'));
const TokenQRScreen = lazy(() => import('./src/screens/Farmer/TokenQRScreen'));

import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';
import { FarmerDataProvider, useFarmerData } from './src/contexts/FarmerDataContext';
import { LoadingSpinner } from './src/components';
import ForceUpdateModal from './src/components/ForceUpdateModal';
import { resetApiTokenCache, setApiTokenCache } from './src/utils/apiClient';
import * as Application from 'expo-application';

const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0';
const CURRENT_BUILD_VERSION = parseInt(Application.nativeBuildVersion || '0', 10);

function isVersionOutdated(currentVersion: string, minVersion: string): boolean {
  if (!currentVersion || !minVersion) return false;
  const currParts = currentVersion.split('.').map(n => parseInt(n, 10) || 0);
  const minParts = minVersion.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(currParts.length, minParts.length);
  for (let i = 0; i < len; i++) {
    const c = currParts[i] || 0;
    const m = minParts[i] || 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './src/services/NotificationService';
import { API_BASE_URL } from './src/config/config';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import ParticleBackground from './src/components/ParticleBackground';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Memoize lazy components for stability
const MemoizedFarmerDashboard = React.memo(FarmerDashboard);

const MemoizedSlotBooking = React.memo(SlotBookingScreen);
const MemoizedTokenQR = React.memo(TokenQRScreen);



// Memoize SplashScreen to prevent it from re-rendering/restarting when App state changes
const SplashScreen = React.memo(SplashScreenComponent);

type Screen =
  | 'Splash'
  | 'FarmerRegistration'
  | 'FarmerLogin'
  | 'FarmerDashboard'
  | 'SlotBooking'
  | 'TokenQR';

export default function App() {
  return (
    <SettingsProvider>
      <FarmerDataProvider>
        <AppInner />
      </FarmerDataProvider>
    </SettingsProvider>
  );
}

function AppInner() {
  const { prefetch, clearData, isReady } = useFarmerData();
  const { settings } = useSettings();
  const [currentScreen, setCurrentScreen] = useState<Screen>('Splash');

  const [hasSkippedUpdate, setHasSkippedUpdate] = useState(false);

  // App update check logic
  const updateStatus = React.useMemo(() => {
    if (!settings) return { show: false, isOptional: false };

    // ── iOS Update Check ──────────────────────────────────────────────────────────
    // On iOS (TestFlight / App Store), only check if iOS-specific settings are explicitly configured
    if (Platform.OS === 'ios') {
      const iosMinBuild = Number(settings.farmer_app_ios_min_build ?? 0);
      const iosLatestBuild = Number(settings.farmer_app_ios_latest_build ?? iosMinBuild);
      const isIosForceActive = Boolean(settings.farmer_app_ios_force_update);

      if (iosMinBuild === 0 && !isIosForceActive) {
        // No iOS force update configured (e.g. TestFlight testing phase)
        return { show: false, isOptional: false };
      }

      let isForced = false;
      let isOptionalAvailable = false;

      if (iosMinBuild > 0 && CURRENT_BUILD_VERSION < iosMinBuild) {
        isForced = true;
      } else if (isIosForceActive && iosLatestBuild > 0 && CURRENT_BUILD_VERSION < iosLatestBuild) {
        isForced = true;
      }

      if (!isForced && iosLatestBuild > 0 && CURRENT_BUILD_VERSION < iosLatestBuild) {
        isOptionalAvailable = true;
      }

      if (isOptionalAvailable && hasSkippedUpdate) {
        return { show: false, isOptional: false };
      }

      return {
        show: isForced || isOptionalAvailable,
        isOptional: isOptionalAvailable
      };
    }

    // ── Android Update Check ──────────────────────────────────────────────────────
    const minVersionCode = Number(settings.farmer_app_min_version_code ?? settings.min_app_version_code ?? 0);
    const latestVersionCode = Number(settings.farmer_app_latest_version_code ?? minVersionCode);
    const isForceActive = Boolean(settings.farmer_app_force_update ?? settings.force_update_active ?? settings.force_update);

    let isForced = false;
    let isOptionalAvailable = false;

    // 1. Check if forced (Current version is below minimum allowed OR force_update is active and we are below latest)
    if (minVersionCode > 0 && CURRENT_BUILD_VERSION < minVersionCode) {
      isForced = true;
    } else if (isForceActive && latestVersionCode > 0 && CURRENT_BUILD_VERSION < latestVersionCode) {
      isForced = true;
    }

    // 2. Check if optional update is available
    if (!isForced && latestVersionCode > 0 && CURRENT_BUILD_VERSION < latestVersionCode) {
      isOptionalAvailable = true;
    }

    // If user skipped the optional update, hide it
    if (isOptionalAvailable && hasSkippedUpdate) {
      return { show: false, isOptional: false };
    }

    return { 
      show: isForced || isOptionalAvailable, 
      isOptional: isOptionalAvailable 
    };
  }, [settings, hasSkippedUpdate]);
  const [farmerName, setFarmerName] = useState('');
  const [farmerId, setFarmerId] = useState<string>('');
  const [farmerPhoto, setFarmerPhoto] = useState<string | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  // Cached session so handleSplashFinish doesn't need async work
  const sessionRef = React.useRef<any>(null);

  // 🔥 CRITICAL: Fire session check + data prefetch AT APP MOUNT
  // This runs during the 2.5s splash animation — data is ready BEFORE dashboard mounts
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await AsyncStorage.getItem('user_session');
        if (session) {
          const farmerData = JSON.parse(session);
          sessionRef.current = farmerData; // Store for handleSplashFinish
          // Start fetching NOW — runs in parallel with splash animation
          prefetch(farmerData.farmer_id, farmerData.name);
        }
      } catch (e) {
        console.error('Session init error:', e);
      } finally {
        setIsSessionChecked(true);
      }
    };
    initSession();
  }, []); // Runs once, immediately on mount

  // 🔥 Global Back Handler for non-dashboard screens
  useEffect(() => {
    const handleBackPress = () => {
      if (currentScreen === 'FarmerRegistration') {
        setCurrentScreen('FarmerLogin');
        return true;
      }
      if (currentScreen === 'TokenQR') {
        setCurrentScreen('FarmerDashboard');
        return true;
      }
      return false; // Let default behavior happen
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [currentScreen]);

  useEffect(() => {
    const requestAllPermissions = async () => {
      try {
        // 1. Request Notification Permission
        const token = await requestNotificationPermission();
        if (token) {
          console.log('FCM Token Ready:', token);
        }

        // 2. Request Camera Permission
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          console.log('Camera permission denied');
        }

        // 3. Request Media Library (Photos) Permission
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (mediaStatus !== 'granted') {
          console.log('Media library permission denied');
        }

        // 4. Request Media Library (Save) Permission
        const { status: saveStatus } = await MediaLibrary.requestPermissionsAsync();
        if (saveStatus !== 'granted') {
          console.log('Media save permission denied');
        }

        await Notifications.dismissAllNotificationsAsync();

        // 5. Ensure Notification Channel exists
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Booking & Status Updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
            showBadge: true,
            enableVibrate: true,
            enableLights: true,
          });
          await Notifications.setBadgeCountAsync(0);
        }

      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    };

    requestAllPermissions();

    // 1. Handle foreground messages (triggers local Expo popup banner)
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'नई सूचना',
            body: remoteMessage.notification?.body || '',
            data: remoteMessage.data || {},
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
          },
          trigger: {
            channelId: 'default',
          } as any,
        });
      } catch (e) {
        console.error('Error displaying foreground notification:', e);
      }
    });

    // 2. Handle token refresh to keep database in sync across reinstalls / rotations
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM Token Refreshed:', newToken);
      try {
        const session = await AsyncStorage.getItem('user_session');
        if (session) {
          const farmerData = JSON.parse(session);
          if (farmerData?.farmer_id) {
            await fetch(`${API_BASE_URL}/update_fcm_token.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_type: 'farmer',
                user_id: farmerData.farmer_id,
                fcm_token: newToken
              })
            });
          }
        }
      } catch (e) {
        console.error('Error syncing refreshed FCM token:', e);
      }
    });

    // 3. Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      Notifications.dismissAllNotificationsAsync();
    });

    // 4. Handle App State changes (clear badge when coming to foreground)
    const stateSubscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'active') {
        Notifications.dismissAllNotificationsAsync();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTokenRefresh();
      responseSubscription.remove();
      stateSubscription.remove();
    };
  }, []);

  const handleSplashFinish = async () => {
    try {
      // Session was already read at mount — just use it, no async needed here
      const farmerData = sessionRef.current;
      if (farmerData) {
        setFarmerName(farmerData.name);
        setFarmerId(farmerData.farmer_id);
        setFarmerPhoto(farmerData.profile_photo);
        // Data prefetch already running since mount — may already be done!
        setCurrentScreen('FarmerDashboard');

        // Update FCM Token in background (non-blocking)
        requestNotificationPermission().then(fcmToken => {
          if (fcmToken) {
            fetch(`${API_BASE_URL}/update_fcm_token.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_type: 'farmer',
                user_id: farmerData.farmer_id,
                fcm_token: fcmToken
              })
            }).catch(e => console.error('FCM update error:', e));
          }
        }).catch(e => console.error('FCM token error:', e));

      } else {
        // Fallback: no session, go to login
        setCurrentScreen('FarmerLogin');
      }
    } catch (error) {
      console.error('Error in splash finish:', error);
      setCurrentScreen('FarmerLogin');
    }
  };

  const handleFarmerRegistration = (data: any) => {
    setCurrentScreen('FarmerLogin');
  };

  const handleFarmerLogin = async (farmerData: any, token: string) => {
    console.log('👨‍🌾 Farmer login data received:', farmerData);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(farmerData));
      await AsyncStorage.setItem('@auth_token', token);
      setApiTokenCache(token);
      setFarmerName(farmerData.name);
      setFarmerId(farmerData.farmer_id);
      setFarmerPhoto(farmerData.profile_photo);

      // 🔥 Prefetch data immediately after login
      prefetch(farmerData.farmer_id, farmerData.name);

      setCurrentScreen('FarmerDashboard');

      // Update FCM token right after login
      try {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          await fetch(`${API_BASE_URL}/update_fcm_token.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_type: 'farmer',
              user_id: farmerData.farmer_id,
              fcm_token: fcmToken
            })
          });
        }
      } catch (e) {
        console.error('Error updating FCM Token on login:', e);
      }

    } catch (error) {
      console.error('Error saving session:', error);
      Alert.alert('Error', 'Failed to save login session');
    }
  };

  const handleLogout = React.useCallback(async () => {
    try {
      await AsyncStorage.removeItem('user_session');
      await AsyncStorage.removeItem('@auth_token');
      resetApiTokenCache();
      clearData(); // Wipe prefetched data from context
      setFarmerPhoto(null);
      setCurrentScreen('FarmerLogin');
    } catch (error) {
      console.error('Error clearing session:', error);
      setCurrentScreen('FarmerLogin');
    }
  }, [clearData]);

  const handlePhotoChange = React.useCallback((newPhotoUrl: string) => {
    setFarmerPhoto(newPhotoUrl);
  }, []);



  const handleConfirmBooking = React.useCallback((newBooking: any) => {
    // Add to local state so dashboard updates instantly
    const enrichedBooking = {
      ...newBooking,
      id: newBooking.id || Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBooking(enrichedBooking);
    setMyBookings(prev => [enrichedBooking, ...prev]);

    setCurrentScreen('TokenQR');
  }, []);

  // Pre-calculate visibility for core screens
  const isCoreScreen = ['FarmerDashboard', 'SlotBooking', 'TokenQR'].includes(currentScreen);

  return (
    <SafeAreaProvider>
      <ParticleBackground>
        <Suspense fallback={<LoadingSpinner message="लोड हो रहा है..." />}>
          <View style={styles.container}>
            {/* 1. Transient screens (Mount/Unmount normally) */}
            {currentScreen === 'Splash' && (
              <SplashScreen
                onFinish={handleSplashFinish}
                isReady={isReady || (isSessionChecked && !sessionRef.current)}
              />
            )}

            {currentScreen === 'FarmerRegistration' && (
              <FarmerRegistrationScreen
                onRegister={handleFarmerRegistration}
                onBack={() => setCurrentScreen('FarmerLogin')}
              />
            )}

            {currentScreen === 'FarmerLogin' && (
              <FarmerLoginScreen
                onLogin={handleFarmerLogin}
                onBack={() => { }}
                onRegister={() => setCurrentScreen('FarmerRegistration')}
              />
            )}

            {/* 2. Persistent Authenticated Stack (Zero-lag switching) */}
            {isCoreScreen && (
              <View style={{ flex: 1 }}>
                {/* Dashboard */}
                <View style={[styles.screenWrapper, { display: currentScreen === 'FarmerDashboard' ? 'flex' : 'none' }]}>
                  <MemoizedFarmerDashboard
                    farmerName={farmerName}
                    farmerId={farmerId}
                    farmerPhoto={farmerPhoto}
                    myBookings={myBookings}
                    onLogout={handleLogout}
                    onPhotoChange={handlePhotoChange}
                  />
                </View>



                {/* Slot Booking - Conditional mount, but persistent once selected */}
                {selectedRetailer && (
                  <View style={[styles.screenWrapper, { display: currentScreen === 'SlotBooking' ? 'flex' : 'none' }]}>
                    <MemoizedSlotBooking
                      retailer={selectedRetailer}
                      farmerName={farmerName}
                      farmerId={farmerId}
                      onConfirmBooking={handleConfirmBooking}
                      onBack={() => setCurrentScreen('FarmerDashboard')}
                    />
                  </View>
                )}

                {/* Token QR */}
                {booking && (
                  <View style={[styles.screenWrapper, { display: currentScreen === 'TokenQR' ? 'flex' : 'none' }]}>
                    <MemoizedTokenQR
                      booking={booking}
                      onBackToDashboard={() => setCurrentScreen('FarmerDashboard')}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Fallback spinner if we somehow lose state */}
            {!isCoreScreen && !['Splash', 'FarmerRegistration', 'FarmerLogin'].includes(currentScreen) && (
              <LoadingSpinner message="लोड हो रहा है..." />
            )}

            <StatusBar style="auto" />
          </View>
        </Suspense>
      </ParticleBackground>

      {/* App Update Blocker Modal */}
      <ForceUpdateModal
        visible={updateStatus.show}
        isOptional={updateStatus.isOptional}
        onSkip={() => setHasSkippedUpdate(true)}
        currentVersion={CURRENT_APP_VERSION}
        latestVersion={
          Platform.OS === 'ios'
            ? settings?.farmer_app_ios_latest_version_name || CURRENT_APP_VERSION
            : settings?.farmer_app_latest_version_name || settings?.latest_app_version_name || settings?.latest_app_version || CURRENT_APP_VERSION
        }
        title={
          Platform.OS === 'ios'
            ? settings?.farmer_app_ios_update_title || settings?.farmer_app_update_title || settings?.update_title
            : settings?.farmer_app_update_title || settings?.update_title
        }
        message={
          Platform.OS === 'ios'
            ? settings?.farmer_app_ios_update_message || settings?.farmer_app_update_message || settings?.update_message
            : settings?.farmer_app_update_message || settings?.update_message
        }
        playStoreUrl={settings?.farmer_app_play_store_url || settings?.play_store_url}
        appStoreUrl={settings?.farmer_app_app_store_url || settings?.app_store_url}
      />

    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenWrapper: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
});
