import { Dimensions, PixelRatio, Text, TextInput, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device (iPhone X)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * scale(size)
 * Scales width based on screen width. Clamped to avoid extreme enlargement on tablets.
 */
export const scale = (size: number) => {
  const ratio = SCREEN_WIDTH / guidelineBaseWidth;
  const clampedRatio = Math.min(Math.max(ratio, 0.85), 1.3);
  return clampedRatio * size;
};

/**
 * verticalScale(size)
 * Scales height. Strictly clamped on the lower end (0.9) to prevent cards/containers
 * from becoming too small and causing text overflow on short devices (like iPhone SE).
 */
export const verticalScale = (size: number) => {
  const ratio = SCREEN_HEIGHT / guidelineBaseHeight;
  const clampedRatio = Math.min(Math.max(ratio, 0.9), 1.2);
  return clampedRatio * size;
};

/**
 * moderateScale(size, factor)
 * Used for fonts and general scaling where we want a softer scaling curve.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const moderateVerticalScale = (size: number, factor = 0.5) => size + (verticalScale(size) - size) * factor;

export const responsiveFontSize = (size: number, factor = 0.5) => moderateScale(size, factor);
export const responsiveWidth = (size: number) => scale(size);
export const responsiveHeight = (size: number) => verticalScale(size);

// --- GLOBAL FONT SCALING FIX ---
// The user noted texts are 'very bigg' in some devices.
// This is because React Native multiplies our moderateScale by the device's Accessibility Font Scale.
// We limit this system multiplier globally so fonts don't explode and break cards.

const TextElement = Text as any;
const TextInputElement = TextInput as any;

if (TextElement.defaultProps == null) {
    TextElement.defaultProps = {};
}
// Limit the OS font scaling multiplier to max 1.15x
TextElement.defaultProps.maxFontSizeMultiplier = 1.15;

if (TextInputElement.defaultProps == null) {
    TextInputElement.defaultProps = {};
}
TextInputElement.defaultProps.maxFontSizeMultiplier = 1.15;

// --- TABLET DETECTION & RESPONSIVE HOOK ---
export const isTabletDevice = (width = SCREEN_WIDTH, height = SCREEN_HEIGHT): boolean => {
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const aspectRatio = maxDim / minDim;
  // Standard Android / iOS tablet detection: smallest width >= 600dp or large screen with aspect ratio < 1.85
  return minDim >= 600 || (aspectRatio < 1.85 && maxDim >= 900);
};

export const isTablet = isTabletDevice(SCREEN_WIDTH, SCREEN_HEIGHT);

/**
 * useResponsive hook
 * Returns dynamic screen dimensions, tablet status, orientation, and content max-widths
 * automatically adapting to device rotations.
 */
export const useResponsive = () => {
  const { width, height } = Dimensions.get('window');
  const tablet = isTabletDevice(width, height);
  const isLandscape = width > height;

  return {
    width,
    height,
    isTablet: tablet,
    isLandscape,
    contentMaxWidth: tablet ? (isLandscape ? 900 : 760) : 480,
  };
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
