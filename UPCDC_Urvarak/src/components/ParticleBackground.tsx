import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Image } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 15;

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
    id: i,
    x: Math.random() * width,
    y: height + Math.random() * 100,
    radius: Math.random() * 3 + 1.5,
    opacity: Math.random() * 0.4 + 0.1,
    duration: Math.random() * 5000 + 8000,
}));

interface ParticleBackgroundProps {
    children?: React.ReactNode;
    backgroundColor?: string;
    hideImage?: boolean;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
    children,
    backgroundColor = 'transparent',
    hideImage = false
}) => {
    const animations = useRef(particles.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        animations.forEach((anim, index) => {
            Animated.loop(
                Animated.timing(anim, {
                    toValue: 1,
                    duration: particles[index].duration,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ).start();
        });
    }, [animations]);

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Base Layer: Cinematic Field Image */}
            {!hideImage && (
                <Image
                    source={require('../../assets/fresh-grass-with-bokeh-effect.png')}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
            )}

            {/* Middle Layer: Blur & Gradient for sexy depth and readability */}
            <BlurView intensity={20} tint="light" style={styles.blurOverlay}>
                <LinearGradient
                    colors={['rgba(255, 248, 240, 0.4)', 'rgba(255, 243, 224, 0.6)', 'rgba(255, 251, 245, 0.8)']}
                    style={styles.gradient}
                >
                    {/* Top Layer: Animated Floating Particles */}
                    <Svg height={height} width={width} style={styles.svg}>
                        {particles.map((p, i) => {
                            const translateY = animations[i].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -(height + 200)],
                            });

                            const translateX = animations[i].interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0, Math.sin(i) * 20, 0],
                            });

                            const opacity = animations[i].interpolate({
                                inputRange: [0, 0.1, 0.9, 1],
                                outputRange: [0, p.opacity, p.opacity, 0],
                            });

                            return (
                                <AnimatedG
                                    key={p.id}
                                    // @ts-ignore - React Native SVG Animated components have typing issues with style prop
                                    style={{
                                        transform: [
                                            { translateY },
                                            { translateX }
                                        ]
                                    } as any}
                                >
                                    <AnimatedCircle
                                        cx={p.x}
                                        cy={p.y}
                                        r={p.radius}
                                        fill="#FDE68A"
                                        opacity={opacity}
                                    />
                                </AnimatedG>
                            );
                        })}
                    </Svg>
                </LinearGradient>
            </BlurView>

            {/* Content Layer */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: width,
        height: height,
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    svg: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
    }
});

export default ParticleBackground;
