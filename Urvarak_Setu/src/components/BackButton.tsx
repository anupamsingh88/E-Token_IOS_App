import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, SHADOWS, SPACING } from '../constants';
import { scale, verticalScale, moderateScale } from '../utils/responsive';


interface BackButtonProps {
    onPress: () => void;
    style?: any;
    color?: string;
    showShadow?: boolean;
}

const BackButton = ({ onPress, style, color, showShadow = false }: BackButtonProps) => {
    return (
        <TouchableOpacity
            style={[styles.container, style, !showShadow && { elevation: 0, shadowOpacity: 0 }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <Path
                    d="M15 18L9 12L15 6"
                    stroke={color || COLORS.primary}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: moderateScale(44),
        height: verticalScale(44),
        backgroundColor: COLORS.white,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});

export default BackButton;
