import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  BackHandler,
  Image,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

// Current App Version Constants (Match android/app/build.gradle)
export const CURRENT_APP_VERSION_CODE = 14;
export const CURRENT_APP_VERSION_NAME = '2.0.3';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.weknowtech.upcdcurvarak';
export const PLAY_STORE_MARKET_URL =
  'market://details?id=com.weknowtech.upcdcurvarak';

export default function ForceUpdateModal() {
  const { settings } = useSettings();

  const minVersionCode = (settings as any)?.retailer_app_min_version_code ?? (settings as any)?.min_app_version_code;
  const isForceActive = Boolean((settings as any)?.retailer_app_force_update ?? (settings as any)?.force_update_active);
  const customMessage = (settings as any)?.retailer_app_update_message ?? (settings as any)?.update_message;
  const targetPlayStoreUrl = (settings as any)?.retailer_app_play_store_url || (settings as any)?.play_store_url || PLAY_STORE_URL;

  const isUpdateRequired =
    Boolean(minVersionCode && Number(minVersionCode) > CURRENT_APP_VERSION_CODE) ||
    isForceActive;

  // Prevent back button on Android while force update is visible
  useEffect(() => {
    if (!isUpdateRequired) return;

    const backAction = () => {
      // Return true to prevent default back action
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isUpdateRequired]);

  if (!isUpdateRequired) {
    return null;
  }

  const handleUpdatePress = async () => {
    try {
      if (Platform.OS === 'android') {
        const canOpenMarket = await Linking.canOpenURL(PLAY_STORE_MARKET_URL);
        if (canOpenMarket) {
          await Linking.openURL(PLAY_STORE_MARKET_URL);
          return;
        }
      }
      await Linking.openURL(targetPlayStoreUrl);
    } catch (e) {
      console.error('Failed to open play store URL:', e);
      Linking.openURL(targetPlayStoreUrl).catch(() => {});
    }
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="rocket-launch"
              size={48}
              color="#1b5e20"
            />
          </View>

          <Text style={styles.title}>📢 नया वर्शन उपलब्ध है!</Text>
          <Text style={styles.badge}>New Update Available</Text>

          <Text style={styles.message}>
            {customMessage ||
              'UPCDC Urvarak ऐप का नवीनतम वर्शन Google Play Store पर लाइव हो चुका है। सभी नई सुविधाओं और सुचारू सेवा के लिए कृपया ऐप अभी अपडेट करें।'}
          </Text>

          <View style={styles.versionRow}>
            <View style={styles.versionBox}>
              <Text style={styles.versionLabel}>वर्तमान वर्शन</Text>
              <Text style={styles.versionValue}>v{CURRENT_APP_VERSION_NAME}</Text>
            </View>
            <MaterialCommunityIcons
              name="arrow-right-bold"
              size={20}
              color="#9ca3af"
            />
            <View style={styles.versionBox}>
              <Text style={styles.versionLabel}>नवीनतम वर्शन</Text>
              <Text style={[styles.versionValue, { color: '#16a34a' }]}>
                {(settings as any)?.retailer_app_latest_version_name || (settings as any)?.latest_app_version_name || 'Latest'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            activeOpacity={0.85}
            onPress={handleUpdatePress}
          >
            <MaterialCommunityIcons
              name="google-play"
              size={22}
              color="#ffffff"
            />
            <Text style={styles.updateButtonText}>Play Store से अपडेट करें</Text>
          </TouchableOpacity>

          <Text style={styles.subtext}>
            उत्तर प्रदेश को-ऑपरेटिव डेव्लपमेन्ट यूनियन लि. (UPCDC)
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#c8e6c9',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 22,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  versionBox: {
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  versionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b5e20',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    gap: 8,
    shadowColor: '#1b5e20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
});
