# Mobile App Responsiveness Guidelines

This project supports mobile viewports ranging from small devices (iPhone SE, 320–375pt) to standard phones (iPhone 15, ~393pt), large phones (430pt+), and Android devices.

## Core Rules

1. **Safe-Area Insets**:
   - Always account for top notches/Dynamic Island and bottom home indicator using `SafeAreaView` or `useSafeAreaInsets()` from `react-native-safe-area-context`.
   - For scrollable screens with bottom navigation or floating footers, supply dynamic `paddingBottom` on `contentContainerStyle`:
     `paddingBottom: TAB_BAR_HEIGHT (≈80) + insets.bottom + SPACING`.

2. **Flex Layouts & Fluid Widths**:
   - Prefer `flex: 1`, `flexShrink: 1`, and percentage widths over fixed pixel widths for labels, values, and text containers.
   - Set `flexShrink: 1` on text sitting adjacent to icons, status badges, or counter buttons.

3. **Window Dimensions Hook**:
   - Use `useWindowDimensions()` rather than static `Dimensions.get('window')` for elements that depend on dynamic screen width (e.g. QR codes, modal widths, carousels).

4. **Modals & Popups**:
   - Constrain popup cards with `width: '90%'` or `width: '92%'` and `maxWidth: '90%'` (or tablet maximums).
   - Keep inner padding balanced (`SPACING.md`) so content has maximum usable horizontal space.
   - Allow detail rows to wrap cleanly using `flexDirection: 'row'`, `justifyContent: 'space-between'`, `flexWrap: 'wrap'`, and `gap`.

5. **Hindi / Devanagari Typography**:
   - Ensure long Hindi text wraps with a sensible `lineHeight` (`moderateScale(20)` to `moderateScale(26)`) to avoid clipping matras (vowel signs) and diacritics.

6. **Accessibility & Font Scaling**:
   - Limit system accessibility font multiplier with `maxFontSizeMultiplier` (defaulting around `1.3`) so enlarged system text settings do not cause layout breaks or severe card overflows.
