import React, { useState, useEffect, lazy, Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import SplashScreen from './src/screens/SplashScreen';
// Lazy load main screens for code splitting
const RetailerLoginScreen = lazy(() => import('./src/screens/Retailer/RetailerLoginScreen'));
const RetailerMainContainer = lazy(() => import('./src/screens/Retailer/RetailerMainContainer'));
const WebkitScreen = lazy(() => import('./src/screens/WebkitScreen'));

import { LoadingSpinner, ForceUpdateModal } from './src/components';

import { View, Text, Platform, AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';
import { API_BASE_URL } from './src/config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, resetRetailerTokenCache } from './src/utils/apiClient';
import { RetailerDataProvider, useRetailerData } from './src/contexts/RetailerDataContext';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './src/services/NotificationService';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import analytics from '@react-native-firebase/analytics';

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

// Define navigation types
export type RootStackParamList = {
  Splash: undefined;
  RetailerLogin: undefined;
  RetailerDashboard: { retailerId: string | null, setupRequired: boolean };
  WebkitScreen: {
    url?: string;
    postData?: {
      submit?: string;
      username: string;
      userpwd: string;
    };
    username?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const routeNameRef = React.createRef<string | undefined>();

function RootNavigator() {
  const { settings, loading: settingsLoading } = useSettings();
  const { refreshData, isReady: isDataContextReady, clearData } = useRetailerData();
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [forcedSetup, setForcedSetup] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isPermissionsDone, setIsPermissionsDone] = useState(false);



  const SESSION_KEY = '@Urvarak_Retailer_Session';
  const SETUP_KEY = '@Urvarak_Retailer_Setup';


  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedRetailerId = await AsyncStorage.getItem(SESSION_KEY);
        const savedSetup = await AsyncStorage.getItem(SETUP_KEY);
        if (savedRetailerId) {
          setRetailerId(savedRetailerId);
          setForcedSetup(savedSetup === 'true');
          // Use centralized context for refreshing
          refreshData(savedRetailerId);
        }
      } catch (e) {
        console.error('Restore session failed:', e);
      } finally {
        setIsCheckingSession(false);
      }

    };
    restoreSession();

    const requestAllPermissions = async () => {
      try {
        await requestNotificationPermission();
        await Notifications.dismissAllNotificationsAsync();
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            showBadge: false,
          });
          await Notifications.setBadgeCountAsync(0);
        }
      } catch (error) {
        console.error('Permissions error:', error);
      } finally {
        setIsPermissionsDone(true);
      }
    };
    requestAllPermissions();
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || 'New Notification',
          body: remoteMessage.notification?.body,
          data: remoteMessage.data,
          sound: true,
        },
        trigger: null,
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      await Notifications.dismissAllNotificationsAsync();
    });

    const appStateSubscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'active') {
        await Notifications.dismissAllNotificationsAsync();
      }
    });

    return () => {
      unsubscribe();
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
      try {
        await apiFetch(`${API_BASE_URL}/log_client_error.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: isFatal ? 'CRITICAL' : 'ERROR',
            message: error.message || 'Unknown Frontend Error',
            stack: error.stack,
            context: { isFatal, retailerId }
          })
        });
      } catch (err) {
        console.error('Failed to log error to backend:', err);
      }
      originalHandler(error, isFatal);
    });

    const promiseHandler = (id: string, error: any) => {
      apiFetch(`${API_BASE_URL}/log_client_error.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'ERROR',
          message: `Unhandled Promise Rejection: ${error?.message || 'Unknown'}`,
          stack: error?.stack,
          context: { id, retailerId }
        })
      }).catch(() => { });
    };

    // @ts-ignore
    if (global.HermesInternal?.hasPromise?.()) {
      // @ts-ignore
      global.onunhandledrejection = promiseHandler;
    }

    return () => {
      ErrorUtils.setGlobalHandler(originalHandler);
    };
  }, [retailerId]);

  useEffect(() => {
    // Navigation Logic: Proceed if session check is done AND splash animation finished
    // We don't strictly wait for isDataContextReady here because Splash Screen 
    // now has a safety timeout and its own isReady synchronization.
    if (!isCheckingSession && isSplashDone && !settingsLoading) {

      if (navigationRef.isReady()) {
        if (retailerId) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'RetailerDashboard', params: { retailerId, setupRequired: forcedSetup } }],
          });
        } else {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'RetailerLogin' }],
          });
        }
      }
    }
  }, [isCheckingSession, isSplashDone, isDataContextReady, settingsLoading, retailerId, forcedSetup]);


  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.getCurrentRoute()?.name;

        if (previousRouteName !== currentRouteName) {
          // Log screen view to Firebase Analytics
          await analytics().logScreenView({
            screen_name: currentRouteName,
            screen_class: currentRouteName,
          });
        }
        // Save the current route name for later comparison
        routeNameRef.current = currentRouteName;
      }}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: '#FFF' }
          }}
        >
          <Stack.Screen name="Splash">
            {(props) => (
              <SplashScreen
                {...props}
                isReady={isPermissionsDone && (isDataContextReady && !settingsLoading || (!retailerId && !isCheckingSession))}
                onFinish={() => setIsSplashDone(true)}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="RetailerLogin">
            {(props) => (
              <RetailerLoginScreen
                {...props}
                onWebkitLogin={(url, postData, username) => {
                  props.navigation.replace('WebkitScreen', {
                    url,
                    postData,
                    username,
                  });
                }}
                onLoginSuccess={async (isSuperAdmin, id, setupRequired) => {
                  if (!isSuperAdmin && id) {
                    setRetailerId(id);
                    await AsyncStorage.setItem(SESSION_KEY, id);
                    const setupNeeded = setupRequired || false;
                    setForcedSetup(setupNeeded);
                    await AsyncStorage.setItem(SETUP_KEY, setupNeeded ? 'true' : 'false');

                    // Trigger background data load immediately
                    refreshData(id);

                    props.navigation.replace('RetailerDashboard', {
                      retailerId: id,
                      setupRequired: setupNeeded
                    });
                  }
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="WebkitScreen">
            {(props) => <WebkitScreen {...props} />}
          </Stack.Screen>

          <Stack.Screen name="RetailerDashboard">
            {(props) => (
              <RetailerMainContainer
                {...props}
                retailerId={props.route.params?.retailerId || retailerId}
                setupRequired={props.route.params?.setupRequired || forcedSetup}
                onLogout={async () => {
                  resetRetailerTokenCache();
                  await AsyncStorage.removeItem(SESSION_KEY);
                  await AsyncStorage.removeItem(SETUP_KEY);
                  await AsyncStorage.removeItem('retailer_token');
                  await clearData(); // Clear the context data and cache for the old user
                  setRetailerId(null);
                  setForcedSetup(false);
                  props.navigation.replace('RetailerLogin');
                }}
                onSetupComplete={async () => {
                  setForcedSetup(false);
                  await AsyncStorage.setItem(SETUP_KEY, 'false');
                  props.navigation.setParams({ setupRequired: false });
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer>

  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <RetailerDataProvider>
          <AppInner />
        </RetailerDataProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function AppInner() {
  return (
    <>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <RootNavigator />
      <ForceUpdateModal />
    </>
  );
}

