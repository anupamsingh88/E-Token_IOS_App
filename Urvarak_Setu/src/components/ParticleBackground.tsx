import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 15; // slightly reduced for optimal scroll performance

interface ParticleBackgroundProps {
    children?: React.ReactNode;
    transparent?: boolean;
    bubbleColors?: string[]; // Array of colors to choose from
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = React.memo(({
    children,
    transparent = false,
    bubbleColors = [COLORS.primary]
}) => {
    // Generate random particles starting from bottom with assigned colors
    const particles = useRef(Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
        id: i,
        x: Math.random() * width,
        y: height + Math.random() * 100,
        radius: Math.random() * 4 + 2,
        opacity: Math.random() * 0.5 + 0.1,
        duration: Math.random() * 5000 + 8000,
        color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)],
    }))).current;

    const animations = useRef(particles.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const createAnimation = (index: number) => {
            return Animated.loop(
                Animated.timing(animations[index], {
                    toValue: 1,
                    duration: particles[index].duration,
                    easing: Easing.inOut(Easing.ease), // Smooth easing instead of linear
                    useNativeDriver: true, // Truly hardware accelerated for Views
                })
            );
        };

        animations.forEach((anim, index) => {
            createAnimation(index).start();
        });
    }, []);

    const renderParticles = () => (
        <View style={styles.particlesContainer} pointerEvents="none">
            {particles.map((p, i) => {
                const translateY = animations[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(height + 200)], // Move from bottom to top of screen
                });

                const translateX = animations[i].interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, Math.sin(i) * 30, 0], // Gentle wiggle
                });

                const opacity = animations[i].interpolate({
                    inputRange: [0, 0.1, 0.9, 1],
                    outputRange: [p.opacity, p.opacity, p.opacity, 0], // Fade out at end
                });

                // Fallback to p.radius * 2 if p.size is undefined (hot reload safety)
                const diameter = (p.radius || 4) * 2;

                return (
                    <Animated.View
                        key={p.id}
                        style={{
                            position: 'absolute',
                            left: p.x,
                            top: p.y,
                            width: diameter,
                            height: diameter,
                            borderRadius: p.radius || 4,
                            backgroundColor: p.color,
                            opacity: opacity,
                            transform: [
                                { translateY },
                                { translateX }
                            ]
                        }}
                    />
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            {transparent ? (
                renderParticles()
            ) : (
                <LinearGradient
                    colors={['#FFF3E0', '#FFE0B2', '#FFCC80']} // Original warm/golden gradient
                    style={styles.background}
                >
                    {renderParticles()}
                </LinearGradient>
            )}
            {children}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    particlesContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
});

export default ParticleBackground;
